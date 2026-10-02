package com.example.demo.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Logout is an XHR-only endpoint — {@code api.js logoutSession} POSTs it and reads the
 * status — so it has to answer with a status fetch can use instead of a redirect.
 *
 * <p>It used to answer {@code 302 -> /login?logout}. "/login" is an SPA route with no server
 * handler since the Thymeleaf stack was removed, so fetch followed the redirect to a 404.
 * {@code logoutSession} treated that as failure and threw "Logout failed." on every logout,
 * even though LogoutFilter had already destroyed the session. A browser navigating away would
 * have ignored the same 302, which is why it was invisible outside XHR.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LogoutTest {

    /** {@code APP_ALLOWED_ORIGINS} default; {@code logoutSession} calls the API cross-origin. */
    private static final String SPA_ORIGIN = "http://localhost:3000";

    @Autowired
    private MockMvc mockMvc;

    private MockHttpSession loginAsNewStudent() throws Exception {
        String username = "logout" + System.currentTimeMillis();
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"secret123\",\"confirmPassword\":\"secret123\"}"))
                .andExpect(status().isCreated());

        MvcResult result = mockMvc.perform(post("/api/login")
                        .param("username", username).param("password", "secret123"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void logoutAnswersNoContentWithoutARedirect() throws Exception {
        mockMvc.perform(post("/logout").session(loginAsNewStudent()))
                .andExpect(status().isNoContent())
                .andExpect(header().doesNotExist("Location"));
    }

    @Test
    void logoutStillInvalidatesTheSession() throws Exception {
        MockHttpSession session = loginAsNewStudent();
        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isOk());

        mockMvc.perform(post("/logout").session(session)).andExpect(status().isNoContent());

        // 204 must not come to mean "nothing happened" — the session is gone, so the
        // identity endpoint reports anonymous again.
        assertThat(session.isInvalid()).isTrue();
        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithoutASessionIsNoContentRatherThanARedirect() throws Exception {
        // The exact case that reached the SPA as a 401: nothing to redirect with. Signing out
        // twice, or with an already-expired cookie, must still read as success.
        mockMvc.perform(post("/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().doesNotExist("Location"));
    }

    @Test
    void logoutIsReadableFromTheSpaOrigin() throws Exception {
        // Cross-origin fetch can only see the status if CORS headers are present, so a bare
        // 204 that the browser hides would restore the bug as an opaque network failure.
        mockMvc.perform(post("/logout").header("Origin", SPA_ORIGIN))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Access-Control-Allow-Origin", SPA_ORIGIN));
    }
}
