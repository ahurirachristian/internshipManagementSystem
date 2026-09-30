package com.example.demo.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

/**
 * P0: the SPA is the only UI — role access is enforced on the JSON API, not on
 * server-rendered pages. Anonymous callers get a 401, wrong roles a 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void studentCannotAccessAdminApi() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(user("student").authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanAccessAdminApi() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousRequestGetsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void supervisorCanAccessUniversityStats() throws Exception {
        mockMvc.perform(get("/api/university/stats")
                        .with(user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"))))
                .andExpect(status().isOk());
    }
}
