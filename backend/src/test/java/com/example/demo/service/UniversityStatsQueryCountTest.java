package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC11 gate: the landing endpoint is a fixed number of queries regardless of how
 * many students the university has.
 *
 * <p>The plan (§"known latent N+1") records that {@code UniversityDashboardService.evaluations}
 * called {@code findByStudentId} once per student to decide who is "evaluated"
 * and again to build the by-student rows, and called
 * {@code findByStudentIdOrderByDateDesc(...).size()} twice per student for
 * diary readiness. That is 2N for evaluations and 2N for diaries. It was latent
 * only because dev has three students; PC11 makes this endpoint the landing
 * page for every university user, so the cliff would have shipped with the
 * feature that exposed it.
 *
 * <p>Assertions are written against a deliberately inflated cohort rather than
 * the seeded data, because a count that merely "looks constant" on three
 * students proves nothing — an N+1 also looks constant there. The test saves
 * extra students, then asserts that growing the cohort by a large factor does
 * not grow the statement count. If someone reintroduces a per-student loop, the
 * second assertion fails immediately and loudly.
 */
@SpringBootTest
@Transactional
class UniversityStatsQueryCountTest {

    private static final long UNIVERSITY_ID = 19L;
    private static final int EXTRA_STUDENTS = 40;

    @Autowired
    private UniversityDashboardService service;

    @Autowired
    private SessionFactory sessionFactory;

    @Autowired
    private com.example.demo.student.StudentRepository studentRepository;

    private Statistics statistics;

    @BeforeEach
    void enableStatementCounting() {
        statistics = sessionFactory.getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
    }

    @Test
    void queryCountDoesNotScaleWithStudentCount() {
        service.stats(UNIVERSITY_ID);

        long baseline = statistics.getPrepareStatementCount();
        assertTrue(baseline > 0, "expected stats() to run queries at all");

        addStudents(EXTRA_STUDENTS);
        statistics.clear();
        service.stats(UNIVERSITY_ID);
        long grown = statistics.getPrepareStatementCount();

        // Forty extra students must not add a single statement. The old code
        // would have added roughly (EXTRA_STUDENTS * 4).
        assertTrue(grown <= baseline,
                "query count grew with the student cohort: " + baseline + " -> " + grown
                        + " after adding " + EXTRA_STUDENTS + " students. A per-student "
                        + "loop has been reintroduced.");
    }

    @Test
    void repeatedCallsUseTheSameNumberOfQueries() {
        service.stats(UNIVERSITY_ID);
        statistics.clear();
        service.stats(UNIVERSITY_ID);
        long steady = statistics.getPrepareStatementCount();

        addStudents(EXTRA_STUDENTS);
        statistics.clear();
        service.stats(UNIVERSITY_ID);
        long afterGrowth = statistics.getPrepareStatementCount();

        assertTrue(steady > 0, "expected stats() to run queries at all");
        assertTrue(afterGrowth <= steady,
                "query count grew with the student cohort: " + steady + " -> " + afterGrowth);
    }

    /**
     * Saves students into the same university as the existing cohort. Rows are
     * rolled back with the test transaction, so dev data is untouched.
     */
    private void addStudents(int count) {
        for (int i = 0; i < count; i++) {
            com.example.demo.student.Student s = new com.example.demo.student.Student();
            s.setFirstName("Q");
            s.setLastName("C" + i);
            s.setStudentNumber("QCOUNT" + i);
            s.setRegistrationNumber("QREG" + i);
            s.setDegreeProgram("BSc Computer Science");
            // Not null on the entity, but no constraint binds these rows to a
            // real account here: nothing in stats() reads them, and the whole
            // test rolls back.
            s.setUserId(0L);
            s.setUniversityId(UNIVERSITY_ID);
            studentRepository.save(s);
        }
    }
}
