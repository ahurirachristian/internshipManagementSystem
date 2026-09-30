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
 * P2 gate (L21/D11): POST /api/users/{id}/reset — temp password shown once,
 * forced change flagged, prior sessions revoked.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ManagedResetTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private String register(String username) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"oldpass1\",\"confirmPassword\":\"oldpass1\"}"))
                .andExpect(status().isCreated());
        return username;
    }

    @Test
    void adminResetIssuesTempPasswordAndForcesChange() throws Exception {
        String username = "managed" + System.currentTimeMillis();
        register(username);
        Long id = userRepository.findByUsername(username).orElseThrow().getId();

        MvcResult login = mockMvc.perform(post("/api/login")
                        .param("username", username).param("password", "oldpass1"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        Thread.sleep(30);

        MvcResult reset = mockMvc.perform(post("/api/users/" + id + "/reset")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempPassword").isNotEmpty())
                .andReturn();
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\"tempPassword\":\"([^\"]+)\"")
                .matcher(reset.getResponse().getContentAsString());
        org.assertj.core.api.Assertions.assertThat(matcher.find()).isTrue();
        String tempPassword = matcher.group(1);

        // Old session and old password are both dead.
        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/login").param("username", username).param("password", "oldpass1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/login").param("username", username).param("password", tempPassword))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    @Test
    void nonAdminCannotReset() throws Exception {
        String username = "notadmin" + System.currentTimeMillis();
        register(username);
        Long id = userRepository.findByUsername(username).orElseThrow().getId();

        mockMvc.perform(post("/api/users/" + id + "/reset")
                        .with(user("plainstudent").authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void resetUnknownUserIsNotFound() throws Exception {
        mockMvc.perform(post("/api/users/99999999/reset")
                        .with(user("admin").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isNotFound());
    }
}
