package com.example.demo.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * P2 gate (L20/D9): 5 failed sign-ins lock an account for 15 minutes, with no
 * oracle for a correct password while locked and no lock for unknown users.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccountLockoutTest {

    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor fromIp() {
        int n = IP_SEQ.getAndIncrement();
        String ip = "10.88." + ((n / 250) % 250) + "." + ((n % 250) + 1);
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private void register(String username) throws Exception {
        mockMvc.perform(post("/api/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\","
                                + "\"email\":\"" + username + "@example.com\","
                                + "\"password\":\"goodpass1\",\"confirmPassword\":\"goodpass1\"}"))
                .andExpect(status().isCreated());
    }

    private void failLogin(String username) throws Exception {
        mockMvc.perform(post("/api/login").with(fromIp())
                        .param("username", username).param("password", "wrong-pass"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void fiveFailuresLockAccountAndCorrectPasswordIsStillRejected() throws Exception {
        String username = "lockme" + System.currentTimeMillis();
        register(username);
        for (int i = 0; i < 4; i++) {
            failLogin(username);
        }
        mockMvc.perform(post("/api/login").with(fromIp())
                        .param("username", username).param("password", "wrong-pass"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.minutesRemaining").value(15));

        // No oracle: the correct password is also rejected while locked.
        mockMvc.perform(post("/api/login").with(fromIp())
                        .param("username", username).param("password", "goodpass1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("ACCOUNT_LOCKED"));
    }

    @Test
    void successfulLoginResetsTheFailureCounter() throws Exception {
        String username = "counter" + System.currentTimeMillis();
        register(username);
        failLogin(username);
        failLogin(username);

        mockMvc.perform(post("/api/login").with(fromIp())
                        .param("username", username).param("password", "goodpass1"))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(
                userRepository.findByUsername(username).orElseThrow().getFailedLoginAttempts()).isZero();
    }

    @Test
    void lockAutoExpiresAfterTheWindow() throws Exception {
        String username = "autounlock" + System.currentTimeMillis();
        register(username);
        for (int i = 0; i < 5; i++) {
            failLogin(username);
        }
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1));
        userRepository.saveAndFlush(user);

        mockMvc.perform(post("/api/login").with(fromIp())
                        .param("username", username).param("password", "goodpass1"))
                .andExpect(status().isOk());
    }

    @Test
    void unknownUserNeverGetsAnAccountLock() throws Exception {
        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/api/login").with(fromIp())
                            .param("username", "ghost" + i).param("password", "whatever"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("Invalid username or password"));
        }
    }
}
