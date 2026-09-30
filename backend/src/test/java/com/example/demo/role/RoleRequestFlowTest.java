package com.example.demo.role;

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

import com.example.demo.auth.UserRepository;
import com.example.demo.notification.NotificationRepository;

/**
 * P3 gate (R4/L6/L18): request → super admin notified → approve → role live →
 * requester notified; deny/duplicate/non-admin/stale-review guards.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoleRequestFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private String register(String username) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());
        return username;
    }

    private RequestPostProcessor asStudent(String username) {
        return user(username).authorities(new SimpleGrantedAuthority("STUDENT"));
    }

    private RequestPostProcessor asAdmin() {
        return user("admin").authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    private long requestSupervisor(String username, Long universityId) throws Exception {
        String body = "{\"requestedRole\":\"SUPERVISOR\",\"universityId\":"
                + (universityId == null ? "null" : universityId) + "}";
        String response = mockMvc.perform(post("/api/role-requests")
                        .with(asStudent(username))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"id\":(\\d+)").matcher(response);
        org.assertj.core.api.Assertions.assertThat(m.find()).isTrue();
        return Long.parseLong(m.group(1));
    }

    @Test
    void approveGrantsRoleNotifiesBothEndsAndTakesEffectWithoutRelogin() throws Exception {
        String username = "roleflow" + System.currentTimeMillis();
        register(username);
        Long id = requestSupervisor(username, 19L);

        // The super admin sees the request and is notified.
        mockMvc.perform(get("/api/role-requests").param("status", "PENDING").with(asAdmin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestedRole").value("SUPERVISOR"));
        Long adminId = userRepository.findByUsername("admin").orElseThrow().getId();
        org.assertj.core.api.Assertions.assertThat(
                notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(adminId))
                .isNotEmpty();

        mockMvc.perform(post("/api/role-requests/" + id + "/approve")
                        .with(asAdmin()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // R4: the very next request reflects the new role (no re-login).
        mockMvc.perform(get("/api/me").with(asStudent(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("SUPERVISOR"));

        // The requester is notified too.
        Long targetId = userRepository.findByUsername(username).orElseThrow().getId();
        org.assertj.core.api.Assertions.assertThat(
                notificationRepository.findByRecipientUserIdAndReadFalseOrderByCreatedAtDesc(targetId))
                .isNotEmpty();
    }

    @Test
    void denyKeepsRoleAndNotifiesRequester() throws Exception {
        String username = "denied" + System.currentTimeMillis();
        register(username);
        Long id = requestSupervisor(username, 19L);

        mockMvc.perform(post("/api/role-requests/" + id + "/deny")
                        .with(asAdmin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"Not eligible yet\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"));

        mockMvc.perform(get("/api/me").with(asStudent(username)))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void duplicatePendingRequestIsAContlict() throws Exception {
        String username = "dupereq" + System.currentTimeMillis();
        register(username);
        requestSupervisor(username, 19L);

        mockMvc.perform(post("/api/role-requests")
                        .with(asStudent(username))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestedRole\":\"SUPERVISOR\",\"universityId\":19}"))
                .andExpect(status().isConflict());
    }

    @Test
    void requestingTheRoleYouAlreadyHoldIsAConflict() throws Exception {
        String username = "already" + System.currentTimeMillis();
        register(username);
        mockMvc.perform(post("/api/role-requests")
                        .with(asStudent(username))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestedRole\":\"STUDENT\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void nonSuperAdminCannotReview() throws Exception {
        String username = "noreview" + System.currentTimeMillis();
        register(username);
        Long id = requestSupervisor(username, 19L);

        mockMvc.perform(post("/api/role-requests/" + id + "/approve")
                        .with(asStudent(username)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/role-requests").with(asStudent(username)))
                .andExpect(status().isForbidden());
    }

    @Test
    void secondApproveIsRejectedAsAlreadyReviewed() throws Exception {
        String username = "doubleapprove" + System.currentTimeMillis();
        register(username);
        Long id = requestSupervisor(username, 19L);

        mockMvc.perform(post("/api/role-requests/" + id + "/approve")
                        .with(asAdmin()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/role-requests/" + id + "/approve")
                        .with(asAdmin()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isConflict());
    }

    @Test
    void supervisorApprovalWithoutAUniversityIsRejected() throws Exception {
        String username = "nouni" + System.currentTimeMillis();
        register(username);
        Long id = requestSupervisor(username, null);

        mockMvc.perform(post("/api/role-requests/" + id + "/approve")
                        .with(asAdmin()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requesterCanSeeOwnHistory() throws Exception {
        String username = "myreqs" + System.currentTimeMillis();
        register(username);
        requestSupervisor(username, 19L);

        mockMvc.perform(get("/api/role-requests/mine").with(asStudent(username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }
}
