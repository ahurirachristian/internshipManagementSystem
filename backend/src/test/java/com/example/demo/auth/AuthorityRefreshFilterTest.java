package com.example.demo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * P0 (L5): role changes and disables must take effect on the user's very next
 * request — no re-login. Each request below carries ONLY the session cookie
 * (no role post-processor), so what comes back is exactly what the filter
 * + authorization layer derived from the database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthorityRefreshFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void roleGrantAppliesWithoutRelogin() throws Exception {
        // airtel logs in as COMPANY...
        MvcResult login = mockMvc.perform(get("/api/me")
                        .with(SecurityMockMvcRequestPostProcessors.user("airtel").roles("COMPANY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        // ...an operator flips the role straight in the DB (as an admin grant would).
        // A supervisor needs a university scope, so grant one that exists in the catalog.
        UserEntity user = userRepository.findByUsername("airtel").orElseThrow();
        user.setRole(Role.SUPERVISOR);
        user.setUniversityId(2L);
        userRepository.saveAndFlush(user);

        // ...and the very next session-only request already reflects the new role.
        mockMvc.perform(get("/api/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SUPERVISOR"));

        // Their old COMPANY view is gone, the new SUPERVISOR surface is reachable.
        mockMvc.perform(get("/api/admin/users").session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/university/stats").session(session))
                .andExpect(status().isOk());
    }

    @Test
    void disabledUserIsLoggedOutOnNextRequest() throws Exception {
        MvcResult login = mockMvc.perform(get("/api/me")
                        .with(SecurityMockMvcRequestPostProcessors.user("airtel").roles("COMPANY")))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        UserEntity user = userRepository.findByUsername("airtel").orElseThrow();
        user.setEnabled(false);
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/api/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void seededAdminCarriesSuperAdminFlag() throws Exception {
        // The super_admin authority exists in the security context...
        mockMvc.perform(get("/api/me")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN", "super_admin")))
                .andExpect(status().isOk());
        // ...and the DataSeeder stamped the flag on the existing admin row.
        org.assertj.core.api.Assertions.assertThat(
                userRepository.findByUsername("admin").orElseThrow().getSuperAdmin()).isTrue();
    }

    @Test
    void corsRejectsUnknownOrigin() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .options("/api/notifications")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(result -> org.assertj.core.api.Assertions.assertThat(
                        result.getResponse().getHeader("Access-Control-Allow-Origin")).isBlank());
    }
}
