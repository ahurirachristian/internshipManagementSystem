package com.example.demo.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.demo.audit.AuditLog;
import com.example.demo.audit.AuditLogRepository;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.notification.Notification;
import com.example.demo.notification.NotificationRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * Step S6.5 (opportunity plan §8.7): the chunked student notification fan-out
 * [H11] — the plan's one scale risk, and its Tests column names exactly two
 * requirements: <b>a 5k-student fixture where all receive it</b>, and
 * <b>no single huge transaction</b>.
 *
 * <p>The first is proven through the real path — {@code POST /{id}/share}
 * against a university of 5000 students must leave every one of them with
 * exactly one {@code OPPORTUNITY_SHARED} notice, and the fan-out's own audit
 * row must state it went out <b>in 5 chunks</b> (5000 / 1000), not as one
 * write. The second is proven behaviourally, not by inspection: a caller that
 * wraps the fan-out in a transaction and then <b>rolls it back</b> must still
 * leave every chunk behind, because each chunk commits its own
 * {@code REQUIRES_NEW} transaction. A fan-out that joined the caller's
 * transaction would lose all 1500 rows to that rollback and this test fails.
 *
 * <p>The cap is the third leg: beyond {@link NotificationService#FANOUT_CAP}
 * (overridable per call here) the fan-out stops, returns
 * {@code truncated=true}, and the audit row records "truncated to X of Y" —
 * the log-and-stop behaviour §9 demands instead of an unbounded transaction.
 *
 * <p>Direct-call tests use <b>synthetic recipient ids</b> (no user rows): the
 * unit under test is the batching loop, which never validates recipients —
 * and it keeps 6 test fixtures worth of users out of the database. The rows
 * they commit are purged in {@code @AfterEach} from a committed transaction,
 * because a rolled-back test transaction cannot delete a chunk that already
 * committed. The 5k fixture's rows are purged the same way.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OpportunityFanoutTest {

    private static final String PROBE_TYPE = "FANOUT_PROBE";
    /** Synthetic recipient-id base — far past any real auto-increment user id. */
    private static final long SYNTHETIC = 88_000_000L;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private VacancyRepository vacancyRepository;
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private AuditLogRepository auditLogRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** Real user ids whose committed fan-out rows must be purged after the test. */
    private final List<Long> realRecipients = new ArrayList<>();
    /** Synthetic ids whose committed rows must be purged after the test. */
    private final List<Long> syntheticRecipients = new ArrayList<>();

    // --- Fixtures ---

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private UserEntity superAdmin() {
        return userRepository.findByUsername("admin").orElseThrow();
    }

    private long university() {
        String tag = suffix();
        return universityRepository.save(new University(("FNT" + tag).substring(0, 15),
                "Fanout Test University " + tag)).getId();
    }

    private UserEntity supervisor(long universityId) {
        UserEntity user = new UserEntity("fntsup" + suffix(), "hash", Role.SUPERVISOR);
        user.setMustChangePassword(false);
        user.setUniversityId(universityId);
        return userRepository.save(user);
    }

    /** R5: a published advert whose verified creator belongs to this university. */
    private long advert(UserEntity creator) {
        Vacancy advert = new Vacancy("Fanout role " + suffix(),
                "A real role a student can be onboarded into", null, "Kampala", "None",
                Vacancy.Status.PUBLISHED.name(), LocalDate.now().plusDays(30), LocalDate.now());
        advert.setOrigin(Vacancy.Origin.UNIVERSITY);
        advert.setVerifiedBy(creator.getId());
        return vacancyRepository.save(advert).getId();
    }

    private List<Long> bulkStudents(long universityId, int count) {
        List<Long> ids = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            UserEntity account = new UserEntity("fntst" + i + "_" + suffix(), "hash", Role.STUDENT);
            account.setMustChangePassword(false);
            account.setUniversityId(universityId);
            account = userRepository.save(account);
            Student row = new Student();
            row.setUserId(account.getId());
            row.setUniversityId(universityId);
            row.setFirstName("Fan");
            row.setLastName("Out" + i);
            row.setRegistrationNumber("REG" + account.getId());
            row.setStudentNumber("FNT" + account.getId());
            row.setDegreeProgram("Computer Science");
            row.setStartDate(LocalDate.now());
            studentRepository.save(row);
            ids.add(account.getId());
        }
        return ids;
    }

    private List<Long> syntheticIds(int count) {
        List<Long> ids = LongStream.range(0, count).map(i -> SYNTHETIC + i).boxed().toList();
        syntheticRecipients.addAll(ids);
        return ids;
    }

    /**
     * Chunks are committed, so the test's rollback cannot remove them: purge
     * from a transaction of their own, the same way they were written.
     */
    @AfterEach
    void purgeCommittedFanoutRows() {
        Set<Long> recipients = new HashSet<>(realRecipients);
        recipients.addAll(syntheticRecipients);
        if (recipients.isEmpty()) {
            return;
        }
        // REQUIRES_NEW, not the default REQUIRED: @AfterEach runs while the
        // test's transaction is still open, so a joining purge would have its
        // DELETEs rolled back with it — deleting nothing and leaking every
        // committed chunk into the next test method.
        TransactionTemplate purge = new TransactionTemplate(transactionManager);
        purge.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        purge.executeWithoutResult(status -> {
            List<Notification> rows = notificationRepository.findAll().stream()
                    .filter(n -> recipients.contains(n.getRecipientUserId()))
                    .toList();
            notificationRepository.deleteAll(rows);
        });
    }

    private long probeRowCount(String type) {
        return notificationRepository.findAll().stream()
                .filter(n -> type.equals(n.getType()))
                .count();
    }

    private long rowsFor(String type, List<Long> recipients) {
        Set<Long> wanted = new HashSet<>(recipients);
        return notificationRepository.findAll().stream()
                .filter(n -> type.equals(n.getType()) && wanted.contains(n.getRecipientUserId()))
                .count();
    }

    private long rowsForRecipient(Long recipient, String type) {
        return notificationRepository.findAll().stream()
                .filter(n -> type.equals(n.getType()) && recipient.equals(n.getRecipientUserId()))
                .count();
    }

    private String fanoutAudit() {
        return auditLogRepository.findAll().stream()
                .filter(a -> "CREATE".equals(a.getAction()) && "Notification".equals(a.getTargetEntity()))
                .map(AuditLog::getDetails)
                .filter(d -> d != null && (d.contains(PROBE_TYPE) || d.contains("OPPORTUNITY_SHARED")))
                .toList().toString();
    }

    // --- 1. the real path: 5000 students, all notified, in 5 chunks ---

    @Test
    void fiveThousandStudentsAllReceiveTheSharedOpportunityNoticeInFiveChunks() throws Exception {
        long uni = university();
        UserEntity reviewer = supervisor(uni);
        long advertId = advert(reviewer);
        realRecipients.addAll(bulkStudents(uni, 5000));

        mockMvc.perform(post("/api/opportunities/" + advertId + "/share")
                        .with(user(reviewer.getUsername())
                                .authorities(new SimpleGrantedAuthority(Role.SUPERVISOR.name())))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated());

        // All 5000, exactly once each — no silent drop, no double-send.
        long delivered = rowsFor("OPPORTUNITY_SHARED", realRecipients);
        assertThat(delivered).isEqualTo(5000);
        Set<Long> wanted = new HashSet<>(realRecipients);
        Set<Long> seen = notificationRepository.findAll().stream()
                .filter(n -> "OPPORTUNITY_SHARED".equals(n.getType())
                        && wanted.contains(n.getRecipientUserId()))
                .map(Notification::getRecipientUserId)
                .collect(Collectors.toSet());
        assertThat(seen).hasSize(5000);

        // The audit row states the batching: 5000 / 1000 = 5 chunks, not one write.
        assertThat(fanoutAudit()).contains("sent to 5000 recipient(s) in 5 chunk(s)");
    }

    // --- 2. chunking is arithmetic you can pin ---

    @Test
    void theFanoutRunsInChunksOfOneThousand() {
        List<Long> ids = syntheticIds(2500);

        NotificationService.FanoutReport report = notificationService.notifyFanout(ids,
                PROBE_TYPE, "Probe", "body", "/probe");

        assertThat(report.delivered()).isEqualTo(2500);
        assertThat(report.chunks()).isEqualTo(3); // 1000 + 1000 + 500
        assertThat(report.truncated()).isFalse();
        assertThat(rowsFor(PROBE_TYPE, ids)).isEqualTo(2500);
    }

    // --- 3. no single huge transaction [H11] ---

    @Test
    void everyChunkCommitsIndependentlyOfTheCallersTransaction() {
        List<Long> ids = syntheticIds(1500);

        // A caller that changes its mind AFTER the fan-out: if the chunks had
        // joined this transaction, all 1500 rows roll back with it. The
        // caller needs REQUIRES_NEW to be a real, independently-rollback-able
        // transaction — a REQUIRED one would merely join the test's own
        // transaction, whose rollback only happens after the assertions run.
        TransactionTemplate caller = new TransactionTemplate(transactionManager);
        caller.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        caller.executeWithoutResult(status -> {
            notificationService.notifyFanout(ids, PROBE_TYPE, "Probe", "body", "/probe");
            status.setRollbackOnly();
        });

        assertThat(rowsFor(PROBE_TYPE, ids)).isEqualTo(1500);
    }

    // --- 4. the cap, and its log [H11] ---

    @Test
    void theFanoutIsCappedAndTheTruncationIsRecorded() {
        List<Long> ids = syntheticIds(2500);

        NotificationService.FanoutReport report = notificationService.notifyFanout(ids,
                PROBE_TYPE, "Probe", "body", "/probe", 100);

        assertThat(report.delivered()).isEqualTo(100);
        assertThat(report.truncated()).isTrue();
        assertThat(rowsFor(PROBE_TYPE, ids)).isEqualTo(100);
        // The truncation is recorded, not silent: audit says X of Y.
        assertThat(fanoutAudit()).contains("truncated to 100 of 2500");
        // ... and never claims a full delivery.
        assertThat(fanoutAudit()).doesNotContain("sent to 2500");
    }

    // --- 5. one notice per student, whatever the caller's list contains ---

    @Test
    void duplicateRecipientsAreNotifiedExactlyOnce() {
        List<Long> ids = syntheticIds(2);
        List<Long> withDuplicates = new ArrayList<>(List.of(ids.get(0), ids.get(0), ids.get(0),
                ids.get(1), ids.get(0)));

        NotificationService.FanoutReport report = notificationService.notifyFanout(withDuplicates,
                PROBE_TYPE, "Probe", "body", "/probe");

        assertThat(report.delivered()).isEqualTo(2);
        assertThat(report.chunks()).isEqualTo(1);
        assertThat(rowsForRecipient(ids.get(0), PROBE_TYPE)).isEqualTo(1);
        assertThat(rowsForRecipient(ids.get(1), PROBE_TYPE)).isEqualTo(1);
    }

    // --- 6. an empty fan-out writes nothing at all ---

    @Test
    void anEmptyRecipientListWritesNothing() {
        long auditBefore = auditLogRepository.count();

        assertThat(notificationService.notifyFanout(null, PROBE_TYPE, "Probe", "body", "/probe"))
                .isEqualTo(new NotificationService.FanoutReport(0, 0, false));
        assertThat(notificationService.notifyFanout(List.of(), PROBE_TYPE, "Probe", "body", "/probe"))
                .isEqualTo(new NotificationService.FanoutReport(0, 0, false));

        assertThat(probeRowCount(PROBE_TYPE)).isZero();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    /** Keeps MySQL/H2 row counts honest when the suite runs in one JVM. */
    @Test
    void committedProbeRowsAreVisibleToAReaderOutsideTheCallersTransaction() {
        List<Long> ids = syntheticIds(10);

        // Read from a NEW transaction on its own connection — the chunk's
        // commit must already be visible there, which is what "committed"
        // means; a row still riding the caller's uncommitted transaction
        // would be invisible to this reader.
        TransactionTemplate reader = new TransactionTemplate(transactionManager);
        reader.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Long visible = reader.execute(status -> jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE type = ? AND recipient_user_id >= ?",
                Long.class, PROBE_TYPE, SYNTHETIC));
        assertThat(visible).isZero(); // nothing yet

        notificationService.notifyFanout(ids, PROBE_TYPE, "Probe", "body", "/probe");

        Long after = reader.execute(status -> jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE type = ? AND recipient_user_id >= ?",
                Long.class, PROBE_TYPE, SYNTHETIC));
        assertThat(after).isEqualTo(10L);
    }
}
