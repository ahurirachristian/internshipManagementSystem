package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * PC12 gate: diary review backlog per university.
 *
 * <p>This chart is a deliberate deviation from the plan, which names
 * {@code DayDiary.status}. The tests here are what justify it, so they are worth
 * reading before changing the aggregation back:
 *
 * <ul>
 * <li>Grouping by {@code status} would be untestable as a backlog. The seeder
 * writes "PENDING" to every row and never updates it, so the column carries no
 * information about review at all.</li>
 * <li>The real signal is the supervisor comment, which is also what
 * {@code isReviewed} uses in the frontend. The last test pins that the two
 * agree — including on a whitespace-only comment, which is why the query is
 * native SQL.</li>
 * </ul>
 *
 * <p>As elsewhere, no absolute totals are asserted: the app ships real diaries,
 * so every figure is a delta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminDiaryBacklogTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UniversityRepository universityRepository;

    @Autowired
    private DayDiaryRepository dayDiaryRepository;

    @Autowired
    private AdminAnalyticsService service;

    private Long university(String name) {
        University university = new University();
        university.setFullName(name);
        String base = name.replaceAll("[^A-Za-z]", "");
        university.setShortForm((base.length() >= 3 ? base.substring(0, 3) : base + "X").toUpperCase()
                + System.nanoTime() % 100000);
        return universityRepository.save(university).getId().longValue();
    }

    private Long student(String label, Long universityId) {
        UserEntity account = new UserEntity("diar-" + label + System.nanoTime(), "hash", Role.STUDENT);
        account.setMustChangePassword(false);
        userRepository.save(account);

        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(universityId);
        student.setFirstName(label);
        student.setLastName("Student");
        student.setStudentNumber("S-" + label);
        student.setRegistrationNumber("R-" + label);
        student.setDegreeProgram("BSc");
        return studentRepository.save(student).getId();
    }

    private void diary(Long studentId, Long universityId, String comment) {
        DayDiary diary = new DayDiary();
        diary.setDate(LocalDate.of(2026, 8, 19));
        diary.setDailyActivities("activities");
        diary.setKnowledgeAndSkillsGained("skills");
        diary.setAccomplishments("accomplishments");
        // Left as the seeder writes it, to prove the backlog does not depend on
        // this legacy column.
        diary.setStatus("PENDING");
        diary.setStudentId(studentId);
        diary.setUniversityId(universityId);
        diary.setUniversitySupervisorComment(comment);
        dayDiaryRepository.save(diary);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> rowFor(String name) {
        Map<String, Object> stats = service.diaryBacklogByUniversity();
        List<Map<String, Object>> rows = (List<Map<String, Object>>) stats.get("byUniversity");
        return rows.stream()
                .filter(r -> name.equals(r.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no backlog row for " + name));
    }

    private RequestPostProcessor asRole(Role role) {
        UserEntity account = new UserEntity("diarreader-" + role.name() + System.nanoTime(), "hash", role);
        account.setMustChangePassword(false);
        userRepository.save(account);
        return user(account.getUsername()).authorities(new SimpleGrantedAuthority(role.name()));
    }

    @Test
    void anUncommentedDiaryIsBacklog() {
        Long id = university("Backlog Open");
        Long studentId = student("Waiting", id);
        diary(studentId, id, null);

        Map<String, Object> row = rowFor("Backlog Open");
        assertThat(((Number) row.get("awaitingReview")).longValue()).isEqualTo(1L);
        assertThat(((Number) row.get("reviewed")).longValue()).isZero();
    }

    @Test
    void aCommentedDiaryIsNotBacklog() {
        Long id = university("Backlog Cleared");
        Long studentId = student("Done", id);
        diary(studentId, id, "Good progress this week.");

        Map<String, Object> row = rowFor("Backlog Cleared");
        assertThat(((Number) row.get("awaitingReview")).longValue()).isZero();
        assertThat(((Number) row.get("reviewed")).longValue()).isEqualTo(1L);
    }

    @Test
    void aWhitespaceOnlyCommentIsStillBacklog() {
        Long id = university("Backlog Blank");
        Long studentId = student("Blank", id);
        // The frontend's isReviewed trims before testing length, so this entry
        // reads as unreviewed on every supervisor's tab. If this chart counted it
        // as reviewed, an institution-wide backlog would be smaller than the sum
        // of the local ones.
        diary(studentId, id, "   \n  ");

        Map<String, Object> row = rowFor("Backlog Blank");
        assertThat(((Number) row.get("reviewed")).longValue()).isZero();
        assertThat(((Number) row.get("awaitingReview")).longValue()).isEqualTo(1L);
    }

    @Test
    void theBacklogDoesNotDependOnTheLegacyStatusColumn() {
        Long id = university("Backlog Legacy");
        Long studentId = student("Legacy", id);
        // Two rows, byte-identical in status, differing only in their comment.
        diary(studentId, id, null);
        diary(studentId, id, "Reviewed properly.");

        Map<String, Object> row = rowFor("Backlog Legacy");
        assertThat(((Number) row.get("total")).longValue()).isEqualTo(2L);
        assertThat(((Number) row.get("reviewed")).longValue()).isEqualTo(1L);
        assertThat(((Number) row.get("awaitingReview")).longValue()).isEqualTo(1L);
        // Grouping by status would have collapsed both rows into one PENDING
        // bucket and reported a backlog of zero here.
        assertThat(((Number) row.get("reviewedPct")).longValue()).isEqualTo(50L);
    }

    @Test
    void reviewedAndAwaitingAlwaysPartitionTheTotal() {
        Long id = university("Backlog Partition");
        Long studentId = student("Mixed", id);
        diary(studentId, id, null);
        diary(studentId, id, "done");
        diary(studentId, id, "  ");

        Map<String, Object> row = rowFor("Backlog Partition");
        long total = ((Number) row.get("total")).longValue();
        long reviewed = ((Number) row.get("reviewed")).longValue();
        long awaiting = ((Number) row.get("awaitingReview")).longValue();

        // No diary may vanish between the two buckets, and awaiting may never go
        // negative — a negative backlog would narrow the bar backwards.
        assertThat(reviewed + awaiting).isEqualTo(total);
        assertThat(awaiting).isNotNegative();
    }

    @Test
    void aUniversityWithNoDiariesIsOmittedRatherThanShownAsClear() {
        university("Backlog Silent");

        // Reporting 0 here would be indistinguishable from a university whose
        // backlog has genuinely been cleared, which is a different finding.
        Map<String, Object> stats = service.diaryBacklogByUniversity();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) stats.get("byUniversity");
        assertThat(rows).noneMatch(r -> "Backlog Silent".equals(r.get("name")));
    }

    @Test
    void universitiesAreOrderedByHeaviestBacklogFirst() {
        Long heavy = university("Backlog Heavy");
        Long light = university("Backlog Light");
        Long heavyStudent = student("Heavy", heavy);
        for (int i = 0; i < 3; i++) {
            diary(heavyStudent, heavy, null);
        }
        diary(student("Light", light), light, "reviewed");

        Map<String, Object> stats = service.diaryBacklogByUniversity();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) stats.get("byUniversity");
        int heavyAt = -1;
        int lightAt = -1;
        for (int i = 0; i < rows.size(); i++) {
            if ("Backlog Heavy".equals(rows.get(i).get("name"))) {
                heavyAt = i;
            }
            if ("Backlog Light".equals(rows.get(i).get("name"))) {
                lightAt = i;
            }
        }
        assertThat(heavyAt).isGreaterThanOrEqualTo(0);
        assertThat(lightAt).isGreaterThanOrEqualTo(0);
        assertThat(heavyAt).isLessThan(lightAt);
    }

    @Test
    void nonAdminRolesAreRefused() throws Exception {
        for (Role role : new Role[] { Role.SUPERVISOR, Role.COMPANY, Role.STUDENT }) {
            mockMvc.perform(get("/api/admin/analytics/diary-backlog").with(asRole(role)))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void anAdminCanReadTheEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/diary-backlog").with(asRole(Role.ADMIN)))
                .andExpect(status().isOk());
    }
}
