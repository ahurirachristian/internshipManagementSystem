package com.example.demo.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Login fix regression: every seeded role must complete the FULL chain —
 * POST /api/login, then /api/me on the issued session. A legacy database can
 * hold seed rows with enabled=0, which the AuthorityRefreshFilter treats as
 * disabled: login returned 200 but the very next request was logged out, so
 * only admin (the one row the old seeder healed) appeared to work.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LoginAllRolesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppMigrationFlagRepository flagRepository;

    private static final String[][] SEED_ACCOUNTS = {
            {"admin", "admin123", "ADMIN"},
            {"university", "university123", "SUPERVISOR"},
            {"kyu", "kyu123", "SUPERVISOR"},
            {"airtel", "company123", "COMPANY"},
            {"2400101003", "Student@123", "STUDENT"},
    };

    @Test
    void everySeededRoleCompletesTheLoginChain() throws Exception {
        for (String[] account : SEED_ACCOUNTS) {
            MvcResult login = mockMvc.perform(post("/api/login")
                            .param("username", account[0])
                            .param("password", account[1]))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value(account[2]))
                    .andReturn();

            MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
            // The follow-up request below is the step that used to die for every
            // non-admin role when legacy rows carried enabled=0.
            mockMvc.perform(get("/api/me").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value(account[2]));
        }
    }

    @Test
    void healRunsExactlyOnceSoDeliberateDisablesSurviveRestarts() {
        // The one-time legacy heal ran during context boot and recorded its flag;
        // afterwards a super-admin disable is never silently undone by a restart.
        assertThat(flagRepository.existsByName(LegacyAccountHealRunner.FLAG_NAME)).isTrue();
    }
}
