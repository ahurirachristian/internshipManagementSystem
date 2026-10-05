package com.example.demo.notification;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * P0: recipients come only from server-side lookups — never from client input
 * (loophole L15). Every mutating operation is audited.
 */
@Service
public class NotificationService {

    public static final int PAGE_SIZE = 20;

    /**
     * S6.5 [H11]: how many recipient rows one transaction may hold. A
     * university roster runs to thousands, and a single transaction carrying
     * every insert would be the one unbounded write the plan refuses to ship.
     */
    public static final int FANOUT_CHUNK_SIZE = 1000;

    /**
     * S6.5 [H11]: the hard ceiling on one fan-out. Beyond it the notices stop
     * and the truncation is logged rather than the transaction growing without
     * limit (§9's stated fallback: aggregate instead of N rows).
     */
    public static final int FANOUT_CAP = 10_000;

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    /** What one fan-out did — delivered rows, transactions used, cut short or not. */
    public record FanoutReport(long delivered, int chunks, boolean truncated) {
    }

    private final NotificationRepository notificationRepository;
    private final com.example.demo.audit.AuditLogService auditLogService;
    private final TransactionTemplate fanoutTemplate;

    public NotificationService(NotificationRepository notificationRepository,
            com.example.demo.audit.AuditLogService auditLogService,
            PlatformTransactionManager transactionManager) {
        this.notificationRepository = notificationRepository;
        this.auditLogService = auditLogService;
        // S6.5 [H11]: every chunk commits in a transaction of its own, so the
        // caller's transaction never grows with the roster and one slow chunk
        // cannot hold the rest hostage.
        this.fanoutTemplate = new TransactionTemplate(transactionManager);
        this.fanoutTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional
    public void notify(List<Long> recipientUserIds, String type, String title, String body, String link) {
        if (recipientUserIds == null || recipientUserIds.isEmpty()) {
            return;
        }
        recipientUserIds.stream().distinct().filter(java.util.Objects::nonNull).forEach(recipient -> {
            Notification n = new Notification();
            n.setRecipientUserId(recipient);
            n.setType(type);
            n.setTitle(title);
            n.setBody(body);
            n.setLink(link);
            notificationRepository.save(n);
        });
        auditLogService.log("system", "ADMIN", "CREATE", "Notification",
                "Notification '" + type + "' sent to " + recipientUserIds.size() + " recipient(s)", null);
    }

    /** S6.5 [H11]: the student-sized fan-out — same contract as {@link #notify}, {@link #FANOUT_CAP} applied. */
    public FanoutReport notifyFanout(List<Long> recipientUserIds, String type, String title, String body,
            String link) {
        return notifyFanout(recipientUserIds, type, title, body, link, FANOUT_CAP);
    }

    /**
     * S6.5 (plan §9, loophole [H11]): fan-out that refuses to be one huge
     * transaction.
     *
     * <p>Recipients are collapsed to a distinct, non-null list first (one
     * notice per student, whatever the caller's query produced), capped at
     * {@code cap} — a cut fan-out <b>logs a warning and records the truncation
     * in its audit row</b> instead of silently notifying nobody or notifying
     * everyone at unbounded cost — and then written in slices of
     * {@link #FANOUT_CHUNK_SIZE}, <b>each slice in its own
     * {@code REQUIRES_NEW} transaction</b>. The method itself is deliberately
     * not {@code @Transactional}: the whole point is that the caller's
     * transaction never accumulates the roster, and a chunk that committed
     * stays committed.
     *
     * <p>One audit row is written for the whole fan-out (not per chunk),
     * stating the delivered count, the number of chunks, and the truncation
     * when one happened.
     */
    public FanoutReport notifyFanout(List<Long> recipientUserIds, String type, String title, String body,
            String link, int cap) {
        if (recipientUserIds == null || recipientUserIds.isEmpty()) {
            return new FanoutReport(0, 0, false);
        }
        List<Long> targets = recipientUserIds.stream().distinct()
                .filter(java.util.Objects::nonNull).toList();
        if (targets.isEmpty()) {
            return new FanoutReport(0, 0, false);
        }
        int limit = Math.min(targets.size(), Math.max(0, cap));
        boolean truncated = limit < targets.size();
        List<Long> sendTo = targets.subList(0, limit);

        int chunks = 0;
        for (int start = 0; start < sendTo.size(); start += FANOUT_CHUNK_SIZE) {
            List<Long> slice = sendTo.subList(start, Math.min(start + FANOUT_CHUNK_SIZE, sendTo.size()));
            List<Notification> rows = new ArrayList<>(slice.size());
            for (Long recipient : slice) {
                Notification n = new Notification();
                n.setRecipientUserId(recipient);
                n.setType(type);
                n.setTitle(title);
                n.setBody(body);
                n.setLink(link);
                rows.add(n);
            }
            fanoutTemplate.executeWithoutResult(status -> notificationRepository.saveAll(rows));
            chunks++;
        }

        String message = truncated
                ? "Notification '" + type + "' truncated to " + limit + " of " + targets.size()
                        + " recipient(s) — the fan-out cap was reached"
                : "Notification '" + type + "' sent to " + sendTo.size() + " recipient(s) in "
                        + chunks + " chunk(s)";
        if (truncated) {
            logger.warn(message);
        }
        auditLogService.log("system", "ADMIN", "CREATE", "Notification", message, null);
        return new FanoutReport(sendTo.size(), chunks, truncated);
    }

    public List<Notification> findMine(Long userId, Boolean unreadOnly, int page) {
        Pageable pageable = PageRequest.of(Math.max(0, page), PAGE_SIZE);
        if (Boolean.TRUE.equals(unreadOnly)) {
            return notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        }
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional
    public boolean markRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null || !notification.getRecipientUserId().equals(userId)) {
            return false;
        }
        notification.setRead(true);
        notificationRepository.save(notification);
        return true;
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .forEach(n -> n.setRead(true));
    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByRecipientUserIdAndReadFalse(userId);
    }
}
