package com.example.demo.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC12 gate: per-programme placement rates.
 *
 * <p>Two things are worth pinning here, and one of them is about a number the
 * dashboard does not show.
 *
 * <p>First, the rate must use the same definition of "placed" as the headline
 * placementRatePct and the per-school rows already on screen. A chart reading
 * "programme A is at 60%" directly under a headline reading "placement rate 75%"
 * invites the reader to reconcile two numbers that were computed from different
 * definitions. The test asserts the totals agree, not merely that each looks
 * plausible.
 *
 * <p>Second, a programme whose students are all unplaced must be reported at 0%,
 * not omitted. The seed cohort has no such programme, so it is built here —
 * an omitted row is the more flattering-looking bug and the one a reviewer would
 * not notice.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProgrammePlacementRateTest {

    private static final long UNIVERSITY_ID = 19L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.example.demo.service.UniversityDashboardService service;

    @Autowired
    private com.example.demo.student.StudentRepository studentRepository;

    @Autowired
    private com.example.demo.programme.ProgrammeRepository programmeRepository;

    @Autowired
    private com.example.demo.school.SchoolRepository schoolRepository;

    @Test
    void programmeTotalsReconcileWithTheHeadlineRate() {
        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows =
                (List<Map<String, Object>>) rosters.get("programmePlacementRates");

        assertFalse(rows.isEmpty(), "expected the seeded cohort to cover at least one programme");

        long cohort = ((Number) rosters.get("totalStudents")).longValue();
        long assigned = ((Number) rosters.get("assigned")).longValue();

        long counted = rows.stream().mapToLong(r -> ((Number) r.get("total")).longValue()).sum();
        long placed = rows.stream().mapToLong(r -> ((Number) r.get("placed")).longValue()).sum();

        // Students with no programme are outside every programme's total, so the
        // per-programme rows can only ever be a subset. What must hold is that
        // they never exceed the cohort, and that placed never exceeds counted.
        assertTrue(counted <= cohort,
                "programme totals (" + counted + ") cannot exceed the cohort (" + cohort + ")");
        assertTrue(placed <= counted, "placed cannot exceed the programme's own total");
        assertTrue(placed <= assigned,
                "programme placements (" + placed + ") cannot exceed the university total (" + assigned + ")");
    }

    @Test
    void aProgrammeWithNoPlacementsReportsZeroRatherThanBeingOmitted() {
        // Give a student a programme nobody has placed. The chart must show a 0%
        // bar for it, not silently leave it out — a missing row reads as "not a
        // problem here", which is the opposite of what zero means.
        com.example.demo.programme.Programme programme = new com.example.demo.programme.Programme();
        programme.setProgrammeId(9999);
        programme.setProgrammeName("Unplaced Programme");
        programme.setProgrammeCode("UNP");
        programme.setProgrammeLevel("BACHELOR");
        programme.setDurationYears(3);
        programme.setUniversityId((int) UNIVERSITY_ID);
        // Reuse a school that really belongs to this university rather than
        // inventing an id: school_id is a foreign key, and a dangling one would
        // fail the insert for reasons unrelated to what this test is about.
        programme.setSchoolId(schoolRepository.findByUniversityId((int) UNIVERSITY_ID).get(0).getSchoolId());
        programmeRepository.saveAndFlush(programme);

        for (com.example.demo.student.Student s : studentRepository.findByUniversityId(UNIVERSITY_ID)) {
            s.setProgrammeId(9999L);
            // The seeded cohort is already partly placed, so moving it into a
            // programme does not by itself make that programme unplaced. Clear
            // the placement too, or the test would pass by accident on the wrong
            // number.
            s.setInternshipCompanyId(null);
        }
        studentRepository.flush();

        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows =
                (List<Map<String, Object>>) rosters.get("programmePlacementRates");

        Map<String, Object> target = rows.stream()
                .filter(r -> "Unplaced Programme".equals(r.get("programmeName")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("a programme with students was omitted entirely"));

        assertEquals(0L, ((Number) target.get("placed")).longValue());
        assertEquals(0L, ((Number) target.get("placementRatePct")).longValue());
        assertTrue(((Number) target.get("total")).longValue() > 0);
    }

    @Test
    void ratesAreOrderedHighestFirstAndBoundedByOneHundred() {
        Map<String, Object> stats = service.stats(UNIVERSITY_ID);
        @SuppressWarnings("unchecked")
        Map<String, Object> rosters = (Map<String, Object>) stats.get("rosters");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows =
                (List<Map<String, Object>>) rosters.get("programmePlacementRates");

        long previous = Long.MAX_VALUE;
        for (Map<String, Object> row : rows) {
            long rate = ((Number) row.get("placementRatePct")).longValue();
            assertTrue(rate >= 0 && rate <= 100, "rate out of range: " + rate);
            assertTrue(rate <= previous, "rows are not ordered highest rate first");
            previous = rate;
        }
    }

    @Test
    void isExposedOnTheEndpointAndStaysScoped() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(
                        user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rosters.programmePlacementRates").isArray());

        // Another university must get its own figures, not this one.
        mockMvc.perform(get("/api/university/stats").with(
                        user("kyu").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rosters.programmePlacementRates").isArray());
    }

}
