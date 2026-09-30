package com.example.demo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.email.ConsoleEmailSender;

/**
 * P2 gate (R1, L1/L2/L10/L11/L12): forgot → emailed token → reset → login.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PasswordResetFlowTest {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConsoleEmailSender consoleEmailSender;

    @BeforeEach
    void clearOutbox() {
        consoleEmailSender.clear();
    }

    private static String uniqueIp() {
        int n = IP_SEQ.getAndIncrement();
        return "10.77." + ((n / 250) % 250) + "." + ((n % 250) + 1);
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private String register(String username, String password) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"" + password + "\","
                                + "\"confirmPassword\":\"" + password + "\"}"))
                .andExpect(status().isCreated());
        return username + "@example.com";
    }

    private String requestToken(String email, String ip) throws Exception {
        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .with(fromIp(ip))
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());
        Matcher matcher = TOKEN.matcher(consoleEmailSender.lastEmail().html());
        org.assertj.core.api.Assertions.assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private String body(String token, String password) {
        return "{\"token\":\"" + token + "\",\"password\":\"" + password
                + "\",\"confirmPassword\":\"" + password + "\"}";
    }

    @Test
    void forgotResetThenLoginWithNewPassword() throws Exception {
        String username = "resetflow" + System.currentTimeMillis();
        String email = register(username, "oldpass1");
        String token = requestToken(email, uniqueIp());

        mockMvc.perform(post("/api/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(token, "newpass2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully."));

        mockMvc.perform(post("/api/login").param("username", username).param("password", "oldpass1"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/login").param("username", username).param("password", "newpass2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void unknownEmailStillReturnsGenericMessageAndSendsNothing() throws Exception {
        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .with(fromIp(uniqueIp()))
                        .content("{\"email\":\"ghost" + System.currentTimeMillis() + "@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message")
                        .value("If that email exists, a reset link is on its way."));
        org.assertj.core.api.Assertions.assertThat(consoleEmailSender.sentEmails()).isEmpty();
    }

    @Test
    void tokenIsSingleUse() throws Exception {
        String username = "singleuse" + System.currentTimeMillis();
        String token = requestToken(register(username, "oldpass1"), uniqueIp());

        mockMvc.perform(post("/api/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(token, "newpass2"))).andExpect(status().isOk());
        mockMvc.perform(post("/api/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(token, "newpass3")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("RESET_LINK_INVALID_OR_EXPIRED"));
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        String username = "expired" + System.currentTimeMillis();
        String email = register(username, "oldpass1");
        String token = requestToken(email, uniqueIp());

        UserEntity user = userRepository.findByEmail(email).orElseThrow();
        user.setPasswordResetExpiresAt(LocalDateTime.now().minusMinutes(1));
        userRepository.saveAndFlush(user);

        mockMvc.perform(post("/api/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(token, "newpass2")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("RESET_LINK_INVALID_OR_EXPIRED"));
    }

    @Test
    void mismatchedPasswordsDoNotConsumeTheToken() throws Exception {
        String username = "mismatch" + System.currentTimeMillis();
        String token = requestToken(register(username, "oldpass1"), uniqueIp());

        mockMvc.perform(post("/api/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"password\":\"newpass2\","
                                + "\"confirmPassword\":\"different3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Passwords do not match."));

        mockMvc.perform(post("/api/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(token, "newpass2"))).andExpect(status().isOk());
    }

    @Test
    void perIpRateLimitReturns429() throws Exception {
        String ip = uniqueIp();
        register("ratelimit" + System.currentTimeMillis(), "oldpass1");
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/forgot-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .with(fromIp(ip))
                            .content("{\"email\":\"nobody@example.com\"}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .with(fromIp(ip))
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void resetKillsExistingSessions() throws Exception {
        String username = "killsession" + System.currentTimeMillis();
        String email = register(username, "oldpass1");

        MvcResult login = mockMvc.perform(post("/api/login")
                        .param("username", username).param("password", "oldpass1"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        org.assertj.core.api.Assertions.assertThat(session).isNotNull();

        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isOk());

        Thread.sleep(30);
        String token = requestToken(email, uniqueIp());

        mockMvc.perform(post("/api/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(token, "newpass2"))).andExpect(status().isOk());

        // L12: the pre-reset cookie is dead.
        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isUnauthorized());
    }
}
