package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.placement.Placement;
import com.example.demo.placement.PlacementRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * PC12 gate: placement coverage per university.
 *
 * <p>Three of these tests exist because of a specific way this number can be
 * wrong while still looking reasonable.
 *
 * <p>First, a student may hold several placements — a cancelled attempt and a
 * later offer. Counting placement records would call one covered student two and
 * push coverage above 100%. The count is over distinct students and the test
 * builds that exact student.
 *
 * <p>Second, a cancelled placement must not count as coverage. It is the
 * tempting way to make the number look better, and it hides precisely the
 * students who need re-placing.
 *
 * <p>Third, coverage is system-wide, so ADMIN is the only role permitted. As
 * with the PC5 chart, nothing asserts absolute totals — the seeder ships real
 * students and placements, so every figure is a delta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminPlacementCoverageTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UniversityRepository universityRepository;

    @Autowired
    private PlacementRepository placementRepository;

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
        UserEntity account = new UserEntity("cov-" + label + System.nanoTime(), "hash", Role.STUDENT);
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

    private void placement(Long studentId, Long universityId, Placement.Status status) {
        Placement placement = new Placement();
        placement.setStudentId(studentId);
        // company_id is NOT NULL; the seeded companies are not referenced here so
        // the fixture cannot break if the seeder changes, and this endpoint never
        // groups by company.
        placement.setCompanyId(1L);
        placement.setUniversityId(universityId);
        placement.setUniversitySupervisor("coverage-fixture");
        placement.setCompanySupervisor("coverage-fixture");
        placement.setStatus(status);
        placementRepository.save(placement);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> rowFor(String name) {
        Map<String, Object> stats = service.placementCoverage();
        List<Map<String, Object>> rows = (List<Map<String, Object>>) stats.get("byUniversity");
        return rows.stream()
                .filter(r -> name.equals(r.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no coverage row for " + name));
    }

    private RequestPostProcessor asRole(Role role) {
        UserEntity account = new UserEntity("covreader-" + role.name() + System.nanoTime(), "hash", role);
        account.setMustChangePassword(false);
        userRepository.save(account);
        return user(account.getUsername()).authorities(new SimpleGrantedAuthority(role.name()));
    }

    @Test
    void anActivePlacementCoversItsStudent() {
        Long id = university("Coverage Active");
        Long studentId = student("Covered", id);
        placement(studentId, id, Placement.Status.ASSIGNED);

        Map<String, Object> row = rowFor("Coverage Active");
        assertThat(((Number) row.get("coveredStudents")).longValue()).isEqualTo(1L);
        assertThat(((Number) row.get("uncoveredStudents")).longValue()).isZero();
    }

    @Test
    void aCancelledPlacementIsNotCoverage() {
        Long id = university("Coverage Cancelled");
        Long studentId = student("Dropped", id);
        placement(studentId, id, Placement.Status.CANCELLED);

        // The student still holds the placement record, so a naive "has a
        // placement" check reports them covered. They need re-placing, which is
        // the whole reason this chart exists.
        Map<String, Object> row = rowFor("Coverage Cancelled");
        assertThat(((Number) row.get("coveredStudents")).longValue()).isZero();
        assertThat(((Number) row.get("uncoveredStudents")).longValue()).isEqualTo(1L);
    }

    @Test
    void aStudentWithSeveralPlacementsCountsOnce() {
        Long id = university("Coverage Repeat");
        Long studentId = student("Repeat", id);
        placement(studentId, id, Placement.Status.CANCELLED);
        placement(studentId, id, Placement.Status.ASSIGNED);

        Map<String, Object> row = rowFor("Coverage Repeat");
        assertThat(((Number) row.get("totalStudents")).longValue()).isEqualTo(1L);
        // Two placement rows, one student. Counting rows would report coverage of
        // 2 against a cohort of 1 — a 200% rate on the chart.
        assertThat(((Number) row.get("coveredStudents")).longValue()).isEqualTo(1L);
        assertThat(((Number) row.get("overCoveredStudents")).longValue()).isZero();
    }

    @Test
    void coverageNeverExceedsTheCohort() {
        Long id = university("Coverage Capped");
        Long studentId = student("Solo", id);
        placement(studentId, id, Placement.Status.COMPLETED);
        placement(studentId, id, Placement.Status.ACTIVE);
        placement(studentId, id, Placement.Status.OFFERED);

        Map<String, Object> row = rowFor("Coverage Capped");
        long total = ((Number) row.get("totalStudents")).longValue();
        long covered = ((Number) row.get("coveredStudents")).longValue();
        assertThat(covered).isLessThanOrEqualTo(total);
        assertThat(((Number) row.get("coveragePct")).longValue()).isLessThanOrEqualTo(100L);
    }

    @Test
    void uncoveredStudentsNeverGoesNegative() {
        // Covering every student is the clean case; the row must read 0 uncovered
        // rather than a negative count that would widen the stacked bar backwards.
        Long id = university("Coverage Full");
        Long studentId = student("Full", id);
        placement(studentId, id, Placement.Status.ASSIGNED);

        Map<String, Object> row = rowFor("Coverage Full");
        assertThat(((Number) row.get("uncoveredStudents")).longValue()).isZero();
        assertThat(((Number) row.get("coveragePct")).longValue()).isEqualTo(100L);
    }

    @Test
    void theStatusMixAddsUpToTheTotalPlacements() {
        Long id = university("Coverage Mix");
        Long studentId = student("Mixed", id);
        placement(studentId, id, Placement.Status.ASSIGNED);
        placement(studentId, id, Placement.Status.CANCELLED);

        Map<String, Object> stats = service.placementCoverage();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> byStatus = (List<Map<String, Object>>) stats.get("placementsByStatus");
        long summed = byStatus.stream().mapToLong(r -> ((Number) r.get("count")).longValue()).sum();

        // The mix counts placement records, not students, so it is additive over
        // the placement table and must match totalPlacements exactly.
        assertThat(summed).isEqualTo(((Number) stats.get("totalPlacements")).longValue());
    }

    @Test
    void universitiesAreOrderedByMostNeedingAPlacementFirst() {
        Long needy = university("Coverage Needy");
        Long fine = university("Coverage Fine");
        for (int i = 0; i < 4; i++) {
            student("Needy" + i, needy);
        }
        placement(student("Fine", fine), fine, Placement.Status.ASSIGNED);

        Map<String, Object> stats = service.placementCoverage();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) stats.get("byUniversity");
        int needyAt = -1;
        int fineAt = -1;
        for (int i = 0; i < rows.size(); i++) {
            if ("Coverage Needy".equals(rows.get(i).get("name"))) {
                needyAt = i;
            }
            if ("Coverage Fine".equals(rows.get(i).get("name"))) {
                fineAt = i;
            }
        }
        assertThat(needyAt).isGreaterThanOrEqualTo(0);
        assertThat(fineAt).isGreaterThanOrEqualTo(0);
        assertThat(needyAt).isLessThan(fineAt);
    }

    @Test
    void nonAdminRolesAreRefused() throws Exception {
        for (Role role : new Role[] { Role.SUPERVISOR, Role.COMPANY, Role.STUDENT }) {
            mockMvc.perform(get("/api/admin/analytics/placement-coverage").with(asRole(role)))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void anAdminCanReadTheEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/placement-coverage").with(asRole(Role.ADMIN)))
                .andExpect(status().isOk());
    }
}
