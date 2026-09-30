package com.example.demo.notification;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.example.demo.auth.UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    /** Shared H2 context: clear rows other test classes may have created (rolled back per test). */
    @org.junit.jupiter.api.BeforeEach
    void clearNotifications() {
        notificationRepository.deleteAll();
    }

    private Long userId(String username) {
        return userRepository.findByUsername(username).orElseThrow().getId();
    }

    @Test
    void unreadCountStartsAtZeroForSeededAdmin() throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void notificationsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ownerSeesOwnNotificationsAndUnreadCountTracksReads() throws Exception {
        notificationService.notify(List.of(userId("admin")), "TEST_TYPE",
                "Test title", "Test body", "/admin/dashboard");

        mockMvc.perform(get("/api/notifications")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("TEST_TYPE"))
                .andExpect(jsonPath("$[0].title").value("Test title"))
                .andExpect(jsonPath("$[0].read").value(false));

        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));

        Long id = notificationService.findMine(userId("admin"), false, 0).get(0).getId();

        mockMvc.perform(post("/api/notifications/" + id + "/read")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void otherUsersNotificationsAreInvisible() throws Exception {
        notificationService.notify(List.of(userId("admin")), "PRIVATE_TYPE",
                "Admin only", "Do not show to others", null);

        // Another user sees an empty list and cannot mark the admin's row read.
        mockMvc.perform(get("/api/notifications")
                        .with(SecurityMockMvcRequestPostProcessors.user("airtel").roles("COMPANY")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        Long adminNotificationId = notificationService.findMine(userId("admin"), false, 0).get(0).getId();

        mockMvc.perform(post("/api/notifications/" + adminNotificationId + "/read")
                        .with(SecurityMockMvcRequestPostProcessors.user("airtel").roles("COMPANY")))
                .andExpect(status().isNotFound());
    }

    @Test
    void markAllReadClearsEveryUnread() throws Exception {
        notificationService.notify(List.of(userId("admin")), "BULK_A", "One", null, null);
        notificationService.notify(List.of(userId("admin")), "BULK_B", "Two", null, null);

        mockMvc.perform(post("/api/notifications/read-all")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }
}
