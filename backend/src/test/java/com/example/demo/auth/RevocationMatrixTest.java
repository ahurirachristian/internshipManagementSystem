package com.example.demo.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.notification.NotificationRepository;

/**
 * P4 gate (R6/L5/L6): grant, revoke and disable take effect on the target's next
 * request; only a super admin may reach these endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RevocationMatrixTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AuditLogService auditLogService;

    private String register(String username) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());
        return username;
    }

    private RequestPostProcessor asTarget(String username) {
        return user(username).authorities(new SimpleGrantedAuthority("STUDENT"));
    }

    private RequestPostProcessor asSuperAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"),
                new SimpleGrantedAuthority("super_admin"));
    }

    private Long id(String username) {
        return userRepository.findByUsername(username).orElseThrow().getId();
    }

    @Test
    void grantAppliesWithoutReloginAndNotifies() throws Exception {
        String username = "grantee" + System.currentTimeMillis();
        register(username);

        mockMvc.perform(post("/api/users/" + id(username) + "/role")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPERVISOR\",\"universityId\":19}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/me").with(asTarget(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SUPERVISOR"));

        org.assertj.core.api.Assertions.assertThat(
                notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(id(username)))
                .isNotEmpty();
        org.assertj.core.api.Assertions.assertThat(auditLogService.findAll().stream()
                .anyMatch(l -> "ROLE_GRANTED".equals(l.getAction()))).isTrue();
    }

    @Test
    void demotionAppliesWithoutRelogin() throws Exception {
        String username = "demotee" + System.currentTimeMillis();
        register(username);
        mockMvc.perform(post("/api/users/" + id(username) + "/role")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"COMPANY\",\"companyName\":\"Demo Corp\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/users/" + id(username) + "/role")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"STUDENT\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/me").with(asTarget(username)))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void disableLogsTheTargetOutOnTheirNextRequest() throws Exception {
        String username = "disablee" + System.currentTimeMillis();
        register(username);

        mockMvc.perform(get("/api/me").with(asTarget(username))).andExpect(status().isOk());

        mockMvc.perform(post("/api/users/" + id(username) + "/enabled")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/me").with(asTarget(username))).andExpect(status().isUnauthorized());
    }

    @Test
    void reEnableRestoresAccess() throws Exception {
        String username = "reenable" + System.currentTimeMillis();
        register(username);
        mockMvc.perform(post("/api/users/" + id(username) + "/enabled")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/users/" + id(username) + "/enabled")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true}")).andExpect(status().isOk());

        mockMvc.perform(get("/api/me").with(asTarget(username))).andExpect(status().isOk());
    }

    @Test
    void nonSuperAdminAdminCannotGrantOrDisable() throws Exception {
        String username = "guard" + System.currentTimeMillis();
        register(username);

        // 'plainadmin' has no DB row, so the refresh filter keeps the plain ADMIN
        // authority — proving the super_admin requirement, not the DB flag, guards this.
        RequestPostProcessor plainAdmin =
                user("plainadmin").authorities(new SimpleGrantedAuthority("ADMIN"));
        mockMvc.perform(post("/api/users/" + id(username) + "/role")
                        .with(plainAdmin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SUPERVISOR\",\"universityId\":19}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/users/" + id(username) + "/enabled")
                        .with(plainAdmin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void supervisorGrantWithoutUniversityIsRejected() throws Exception {
        String username = "nounigrant" + System.currentTimeMillis();
        register(username);

        mockMvc.perform(post("/api/users/" + id(username) + "/role")
                        .with(asSuperAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPERVISOR\"}"))
                .andExpect(status().isBadRequest());
    }
}
