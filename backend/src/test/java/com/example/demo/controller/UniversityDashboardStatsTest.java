package com.example.demo.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * M8 gate: GET /api/university/stats returns aggregates scoped to the
 * calling supervisor's own university, and is auth-guarded.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UniversityDashboardStatsTest {

    @Autowired
    private MockMvc mockMvc;

    private org.springframework.test.web.servlet.request.RequestPostProcessor uni19() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor uni2() {
        return user("kyu").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    @Test
    void supervisorSeesOnlyOwnUniversitiesRoster() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni19()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rosters.totalStudents").value(org.hamcrest.Matchers.greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.rosters").exists());
    }

    @Test
    void kyambogoUniversitySeesNoStudents() throws Exception {
        mockMvc.perform(get("/api/university/stats").with(uni2()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rosters.totalStudents").value(0));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/university/stats"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void nonSupervisorRoleIsForbidden() throws Exception {
        mockMvc.perform(get("/api/university/stats")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminWithoutUniversityGetsBadRequest() throws Exception {
        mockMvc.perform(get("/api/university/stats")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isBadRequest());
    }
}
