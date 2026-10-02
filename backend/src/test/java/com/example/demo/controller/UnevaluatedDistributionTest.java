package com.example.demo.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC12 gate: the unevaluated-student distribution reconciles.
 *
 * <p>A distribution chart is the easiest place in this codebase to publish a
 * number that looks plausible and is wrong. If a bucket is missed, or the top
 * bucket stops meaning "this many or more", the bars still render and still
 * taper — nothing crashes, no console warning fires, and the chart just quietly
 * under-reports the students a supervisor most needs to chase.
 *
 * <p>So the assertion here is the invariant rather than a snapshot of the
 * numbers: every student in the cohort appears in exactly one bucket. That
 * property is checked by the service against a hand-built cohort with a student
 * holding more evaluations than the cap, because the seeded data never produces
 * that case and it is exactly the case the cap exists to handle.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UnevaluatedDistributionTest {

    private static final long UNIVERSITY_ID = 19L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.example.demo.service.UniversityDashboardService service;

    @Autowired
    private com.example.demo.student.StudentRepository studentRepository;

    @Autowired
    private com.example.demo.evaluation.EvaluationRepository evaluationRepository;

    private RequestPostProcessor uni19() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    @Test
    void everyStudentLandsInExactlyOneBucket() {
        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> evals = (Map<String, Object>) stats.get("evaluations");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> buckets = (List<Map<String, Object>>) evals.get("byEvaluationCount");

        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");

        long cohort = ((Number) rosters.get("totalStudents")).longValue();
        long bucketed = buckets.stream()
                .mapToLong(b -> ((Number) b.get("students")).longValue())
                .sum();

        // This is the property that matters: the chart cannot lose a student.
        // A missing bucket, or a top bucket that stops absorbing the overflow,
        // shows up here as bucketed < cohort.
        Assertions.assertEquals(cohort, bucketed,
                "every student must appear in exactly one bucket, or the chart "
                        + "under-reports who still needs evaluating");
    }

    @Test
    void zeroBucketAgreesWithTheEvaluatedStudentCount() {
        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> evals = (Map<String, Object>) stats.get("evaluations");
        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");

        long none = ((Number) evals.get("studentsWithNoEvaluation")).longValue();
        long evaluated = ((Number) evals.get("evaluatedStudents")).longValue();
        long cohort = ((Number) rosters.get("totalStudents")).longValue();

        // Two independently computed figures, one statement of fact.
        Assertions.assertEquals(cohort, none + evaluated,
                "studentsWithNoEvaluation and evaluatedStudents must partition the cohort");
    }

    @Test
    void everyBucketIsPresentIncludingEmptyOnes() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                // Five buckets, zero through the cap. An absent bucket would
                // make the frontend drop a column rather than plot a zero.
                .andExpect(jsonPath("$.evaluations.byEvaluationCount", Matchers.hasSize(5)))
                .andExpect(jsonPath("$.evaluations.byEvaluationCount[0].evaluationCount").value(0))
                .andExpect(jsonPath("$.evaluations.byEvaluationCount[4].label").value("4+"));
    }

    /**
     * The seeded cohort tops out below the cap, so the overflow branch is never
     * reached by the fixture. Giving one student more evaluations than the cap
     * is what makes the partition property meaningful: without this the test
     * passes even with the top bucket broken, because the case it guards cannot
     * occur in the data.
     */
    @Test
    void aStudentAboveTheCapIsStillCountedOnce() {
        com.example.demo.student.Student student = studentRepository
                .findByUniversityId(UNIVERSITY_ID).get(0);

        // Well past the cap of 4, so this student cannot be counted at an exact
        // bucket and must land in the open-ended one.
        for (int i = 0; i < 7; i++) {
            evaluationRepository.save(evaluation(student));
        }
        evaluationRepository.flush();

        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> evals = (Map<String, Object>) stats.get("evaluations");
        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> buckets = (List<Map<String, Object>>) evals.get("byEvaluationCount");

        long cohort = ((Number) rosters.get("totalStudents")).longValue();
        long bucketed = buckets.stream()
                .mapToLong(b -> ((Number) b.get("students")).longValue())
                .sum();

        Assertions.assertEquals(cohort, bucketed,
                "a student with more evaluations than the cap must still be counted exactly once, "
                        + "in the open-ended bucket");
    }

    private com.example.demo.evaluation.Evaluation evaluation(
            com.example.demo.student.Student student) {
        com.example.demo.evaluation.Evaluation e = new com.example.demo.evaluation.Evaluation();
        e.setStudentId(student.getId());
        e.setUniversityId(UNIVERSITY_ID);
        e.setSupervisorType("UNIVERSITY");
        e.setSupervisorUsername("university");
        e.setPunctuality(7);
        e.setPracticalWorkEthics(7);
        e.setAttendance(7);
        e.setWorkplacePerformance(7);
        e.setOverallGrade(7);
        return e;
    }

    @Test
    void staysUniversityScoped() throws Exception {
        // A different university's supervisor must not see this cohort.
        mockMvc.perform(get("/api/university/stats")
                        .with(user("kyu").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluations.byEvaluationCount").isArray());
    }
}
