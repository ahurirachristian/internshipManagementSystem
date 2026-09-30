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
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * P4 gate (R14/L16): an account created with a shared initial credential cannot
 * use the app until it sets a new password — enforced by a server-side filter,
 * not just the UI.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MustChangePasswordTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private MockHttpSession login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/login")
                        .param("username", username).param("password", password))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void flaggedUserIsBlockedUntilTheyChangeTheirPassword() throws Exception {
        String username = "firstlogin" + System.currentTimeMillis();
        mockMvc.perform(post("/api/admin/users")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"role\":\"STUDENT\"}"))
                .andExpect(status().isCreated());

        MockHttpSession session = login(username, username + "123");

        // Blocked everywhere except the password change / identity / logout.
        mockMvc.perform(get("/api/notifications").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("PASSWORD_CHANGE_REQUIRED"));
        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isOk());

        mockMvc.perform(post("/api/me/password").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + username + "123\","
                                + "\"newPassword\":\"chosenpass9\"}"))
                .andExpect(status().isOk());

        // The same session now works and the flag is cleared.
        mockMvc.perform(get("/api/notifications").session(session)).andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(
                userRepository.findByUsername(username).orElseThrow().getMustChangePassword()).isFalse();
    }

    @Test
    void selfRegisteredUserIsNotGated() throws Exception {
        String username = "selfserve" + System.currentTimeMillis();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());

        MockHttpSession session = login(username, "secret123");
        mockMvc.perform(get("/api/notifications").session(session)).andExpect(status().isOk());
    }

    @Test
    void wrongCurrentPasswordIsRejected() throws Exception {
        String username = "badcurrent" + System.currentTimeMillis();
        mockMvc.perform(post("/api/admin/users")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"role\":\"STUDENT\"}"))
                .andExpect(status().isCreated());
        MockHttpSession session = login(username, username + "123");

        mockMvc.perform(post("/api/me/password").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"nope\",\"newPassword\":\"chosenpass9\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shortNewPasswordIsRejected() throws Exception {
        String username = "shortpass" + System.currentTimeMillis();
        mockMvc.perform(post("/api/admin/users")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"role\":\"STUDENT\"}"))
                .andExpect(status().isCreated());
        MockHttpSession session = login(username, username + "123");

        mockMvc.perform(post("/api/me/password").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + username + "123\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }
}
