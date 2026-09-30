package com.example.demo.notification;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * P0: recipients come only from server-side lookups — never from client input
 * (loophole L15). Every mutating operation is audited.
 */
@Service
public class NotificationService {

    public static final int PAGE_SIZE = 20;

    private final NotificationRepository notificationRepository;
    private final com.example.demo.audit.AuditLogService auditLogService;

    public NotificationService(NotificationRepository notificationRepository,
            com.example.demo.audit.AuditLogService auditLogService) {
        this.notificationRepository = notificationRepository;
        this.auditLogService = auditLogService;
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
