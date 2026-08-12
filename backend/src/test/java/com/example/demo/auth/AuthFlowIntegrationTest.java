package com.example.demo.auth;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private String json(String username, String role, String password, String confirmPassword) {
        return "{"
                + "\"username\":\"" + username + "\","
                + "\"role\":\"" + role + "\","
                + "\"password\":\"" + password + "\","
                + "\"confirmPassword\":\"" + confirmPassword + "\""
                + "}";
    }

    private void register(String username, String role, String password) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, role, password, password)))
                .andExpect(status().isCreated());
    }

    @Test
    void authPagesAreAccessibleWithoutLogin() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isOk())
                .andExpect(content().string(containsString("Sign in")));
        mockMvc.perform(get("/register")).andExpect(status().isOk())
                .andExpect(content().string(containsString("Create account")));
        mockMvc.perform(get("/forgot-password")).andExpect(status().isOk())
                .andExpect(content().string(containsString("Reset password")));
    }

    @Test
    void rolesEndpointListsAllRoles() throws Exception {
        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("STUDENT"))
                .andExpect(jsonPath("$[1]").value("SUPERVISOR"))
                .andExpect(jsonPath("$[2]").value("ADMIN"))
                .andExpect(jsonPath("$[3]").value("COMPANY"));
    }

    @Test
    void registerCreatesAccountAndAllowsLogin() throws Exception {
        String username = "newstudent" + System.currentTimeMillis();
        String password = "secret123";

        register(username, "STUDENT", password);

        var saved = userRepository.findByUsername(username).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.getRole()).isEqualTo(Role.STUDENT);
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches(password, saved.getPassword())).isTrue();

        mockMvc.perform(post("/api/login")
                        .param("username", username)
                        .param("password", password))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.redirect").value(containsString("/student/dashboard")));
    }

    @Test
    void registerRejectsDuplicateUsername() throws Exception {
        String username = "student";
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, "STUDENT", "whatever1", "whatever1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Username already exists."));
    }

    @Test
    void registerRejectsMismatchedPasswords() throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("mismatch" + System.currentTimeMillis(), "STUDENT", "abc123", "def456")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Passwords do not match."));
    }

    @Test
    void registerRejectsInvalidRole() throws Exception {
        String username = "badrole" + System.currentTimeMillis();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, "ROBOT", "abc123", "abc123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid role selected."));
    }

    @Test
    void loginSucceedsWithValidCredentials() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "student")
                        .param("password", "student123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("student"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.redirect").value(containsString("/student/dashboard")));
    }

    @Test
    void loginFailsWithWrongPassword() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "student")
                        .param("password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    @Test
    void loginRejectsSelectedRoleMismatch() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "student")
                        .param("password", "student123")
                        .param("role", "ADMIN"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Selected role does not match your account role."));
    }

    @Test
    void loginRoutesCompanyToCompanyDashboard() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "airtel")
                        .param("password", "company123")
                        .param("role", "COMPANY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.redirect").value(containsString("/company/dashboard")));
    }

    @Test
    void forgotPasswordResetsPassword() throws Exception {
        String username = "resetme" + System.currentTimeMillis();
        register(username, "STUDENT", "oldpass1");

        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username
                                + "\",\"newPassword\":\"newpass1\",\"confirmPassword\":\"newpass1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully."));

        var saved = userRepository.findByUsername(username).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches("newpass1", saved.getPassword())).isTrue();
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches("oldpass1", saved.getPassword())).isFalse();

        mockMvc.perform(post("/api/login")
                        .param("username", username)
                        .param("password", "oldpass1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/login")
                        .param("username", username)
                        .param("password", "newpass1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void forgotPasswordRejectsUnknownUser() throws Exception {
        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"nobody\",\"newPassword\":\"newpass1\",\"confirmPassword\":\"newpass1\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Username not found."));
    }

    @Test
    void forgotPasswordRejectsMismatchedPasswords() throws Exception {
        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"student\",\"newPassword\":\"aaa111\",\"confirmPassword\":\"bbb222\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Passwords do not match."));
    }
}
