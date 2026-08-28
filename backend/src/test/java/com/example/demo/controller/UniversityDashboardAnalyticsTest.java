package com.example.demo.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * M9 gate: the analytics block of GET /api/university/stats is populated and
 * scoped to the calling supervisor's own university, and the average-score
 * aggregation returns the four metrics (not an empty/nested row).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UniversityDashboardAnalyticsTest {

    @Autowired
    private MockMvc mockMvc;

    private org.springframework.test.web.servlet.request.RequestPostProcessor uni19() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor uni2() {
        return user("kyu").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    @Test
    void analyticsBlockExistsAndIsPopulatedForNkumba() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics").exists())
                .andExpect(jsonPath("$.analytics.byYearOfStudy[*].count", Matchers.hasItems(2, 1)))
                .andExpect(jsonPath("$.analytics.bySchool", Matchers.hasSize(1)))
                .andExpect(jsonPath("$.analytics.bySchool[0].count").value(3))
                .andExpect(jsonPath("$.analytics.byCompany", Matchers.hasSize(1)))
                .andExpect(jsonPath("$.analytics.byCompany[0].interns").value(3))
                .andExpect(jsonPath("$.analytics.avgScores.punctuality").value(8.5))
                .andExpect(jsonPath("$.analytics.avgScores.practicalWorkEthics").value(7.5))
                .andExpect(jsonPath("$.analytics.avgScores.attendance").value(9.0))
                .andExpect(jsonPath("$.analytics.avgScores.workplacePerformance").value(7.5));
    }

    @Test
    void analyticsIsScopedEmptyForKyambogo() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni2()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics.byYearOfStudy", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.analytics.byGender", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.analytics.bySchool", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.analytics.byCompany", Matchers.hasSize(0)));
    }

    @Test
    void placementAndDiaryStatusSeriesPresent() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analytics.placementStatus.ACTIVE").value(3))
                .andExpect(jsonPath("$.analytics.diaryStatus.PENDING").value(0))
                .andExpect(jsonPath("$.analytics.diaryStatus.APPROVED").exists())
                .andExpect(jsonPath("$.analytics.diaryStatus.NEEDS_REVISION").exists());
    }
}
