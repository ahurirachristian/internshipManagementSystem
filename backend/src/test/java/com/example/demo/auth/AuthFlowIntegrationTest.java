package com.example.demo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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

    @Autowired
    private com.example.demo.student.StudentRepository studentRepository;

    @Autowired
    private com.example.demo.university.UniversityRepository universityRepository;

    private String json(String username, String email, String role, String password, String confirmPassword) {
        return "{"
                + "\"username\":\"" + username + "\","
                + "\"email\":\"" + email + "\","
                + "\"role\":\"" + role + "\","
                + "\"password\":\"" + password + "\","
                + "\"confirmPassword\":\"" + confirmPassword + "\""
                + "}";
    }

    private void register(String username, String role, String password) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, username + "@example.com", role, password, password)))
                .andExpect(status().isCreated());
    }

    @Test
    void protectedApisRejectAnonymousUsers() throws Exception {
        // P0: no server-rendered auth pages remain; the SPA talks to the JSON API.
        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
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
    void universityOptionsArePublicAndSlim() throws Exception {
        mockMvc.perform(get("/api/universities/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].fullName").exists())
                .andExpect(jsonPath("$[0].shortForm").exists())
                .andExpect(jsonPath("$[0].country").doesNotExist());
    }

    @Test
    void registerCreatesAccountAndAllowsLogin() throws Exception {
        String username = "newstudent" + System.currentTimeMillis();
        String password = "secret123";

        register(username, "STUDENT", password);

        var saved = userRepository.findByUsername(username).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.getRole()).isEqualTo(Role.STUDENT);
        org.assertj.core.api.Assertions.assertThat(saved.getEmail()).isEqualTo(username + "@example.com");
        org.assertj.core.api.Assertions.assertThat(saved.getMustChangePassword()).isFalse();
        org.assertj.core.api.Assertions.assertThat(passwordEncoder.matches(password, saved.getPassword())).isTrue();

        mockMvc.perform(post("/api/login")
                        .param("username", username)
                        .param("password", password))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.redirect").value(org.hamcrest.Matchers.containsString("/student/dashboard")));
    }

    @Test
    void registerStoresUniversityOnUserAndStudent() throws Exception {
        Integer universityId = universityRepository.findAll().get(0).getUniversityId();
        String username = "uni" + System.currentTimeMillis();

        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"universityId\":\"" + universityId + "\","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());

        var saved = userRepository.findByUsername(username).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.getUniversityId()).isEqualTo(universityId.longValue());
        var student = studentRepository.findByUserId(saved.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(student.getUniversityId()).isEqualTo(universityId.longValue());
    }

    @Test
    void registerWithoutListedUniversityStoresNull() throws Exception {
        String username = "unlisted" + System.currentTimeMillis();

        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, username + "@example.com", "STUDENT", "secret123", "secret123")))
                .andExpect(status().isCreated());

        var saved = userRepository.findByUsername(username).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.getUniversityId()).isNull();
        var student = studentRepository.findByUserId(saved.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(student.getUniversityId()).isNull();
    }

    @Test
    void registerIgnoresIncomingRoleField() throws Exception {
        String username = "wouldbeadmin" + System.currentTimeMillis();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, username + "@example.com", "ADMIN", "abc123", "abc123")))
                .andExpect(status().isCreated());

        org.assertj.core.api.Assertions.assertThat(
                userRepository.findByUsername(username).orElseThrow().getRole()).isEqualTo(Role.STUDENT);
    }

    @Test
    void registerRejectsDuplicateUsername() throws Exception {
        String username = "2400101003";
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, "fresh" + System.currentTimeMillis() + "@example.com",
                                "STUDENT", "whatever1", "whatever1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Username already exists."));
    }

    @Test
    void registerRejectsDuplicateEmailGenerically() throws Exception {
        String username = "dupemail" + System.currentTimeMillis();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(username, "kasaggafred999@gmail.com", "STUDENT", "abc123", "abc123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Please enter a valid email address."));
    }

    @Test
    void registerRejectsMalformedEmail() throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("badmail" + System.currentTimeMillis(), "not-an-email",
                                "STUDENT", "abc123", "abc123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Please enter a valid email address."));
    }

    @Test
    void registerRejectsMismatchedPasswords() throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("mismatch" + System.currentTimeMillis(),
                                "mismatch" + System.currentTimeMillis() + "@example.com",
                                "STUDENT", "abc123", "def456")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Passwords do not match."));
    }

    @Test
    void loginSucceedsWithValidCredentials() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "2400101003")
                        .param("password", "Student@123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("2400101003"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.redirect").value(org.hamcrest.Matchers.containsString("/student/dashboard")));
    }

    @Test
    void loginFailsWithWrongPassword() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "2400101003")
                        .param("password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    @Test
    void loginIgnoresUnknownRoleParam() throws Exception {
        // L4: the role param no longer exists — passing one must neither change the
        // resolved role nor leak an authenticated session on a mismatch.
        mockMvc.perform(post("/api/login")
                        .param("username", "2400101003")
                        .param("password", "Student@123")
                        .param("role", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void loginWithoutRoleParamRoutesCompanyToCompanyDashboard() throws Exception {
        mockMvc.perform(post("/api/login")
                        .param("username", "airtel")
                        .param("password", "company123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.redirect").value(org.hamcrest.Matchers.containsString("/company/dashboard")));
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
                        .content("{\"username\":\"2400101003\",\"newPassword\":\"aaa111\",\"confirmPassword\":\"bbb222\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Passwords do not match."));
    }
}
