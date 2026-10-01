package com.example.demo.evaluation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * PC6a gate: evaluation scores are bounded to 0-10 server-side.
 *
 * The scale was previously asserted only by the HTML input max, so any value
 * up to 100 could be persisted and then plotted on a radar whose domain is
 * [0, 10]. {@code Evaluation} now carries @Max(10) and the controller passes
 * @Valid, so the bound is enforced independently of the form.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EvaluationScoreScaleTest {

    @Autowired
    private MockMvc mockMvc;

    private org.springframework.test.web.servlet.request.RequestPostProcessor supervisor() {
        return user("university").authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private String body(String... values) {
        return "{\"studentId\":1,\"supervisorType\":\"UNIVERSITY\",\"supervisorUsername\":\"university\","
                + "\"punctuality\":" + values[0]
                + ",\"practicalWorkEthics\":" + values[1]
                + ",\"attendance\":" + values[2]
                + ",\"workplacePerformance\":" + values[3]
                + ",\"logbookQuality\":" + values[4]
                + ",\"academicReport\":" + values[5]
                + ",\"presentation\":" + values[6]
                + ",\"overallGrade\":" + values[7] + "}";
    }

    @Test
    void scoreAboveTenIsRejected() throws Exception {
        mockMvc.perform(post("/api/evaluations").with(supervisor())
                        .contentType("application/json")
                        .content(body("50", "8", "8", "8", "8", "8", "8", "8")))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void perfectScoreOfTenIsAccepted() throws Exception {
        // A student row with id 1 must exist for studentId to be non-null.
        mockMvc.perform(post("/api/evaluations").with(supervisor())
                        .contentType("application/json")
                        .content(body("10", "10", "10", "10", "10", "10", "10", "10")))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.overallGrade").value(10));
    }

    @Test
    void seededSingleDigitScoresRoundTrip() throws Exception {
        // EvaluationDataSeeder writes single digits (8, 7, 9); the radar plots
        // domain [0, 10], so these must remain valid after the clamp.
        mockMvc.perform(post("/api/evaluations").with(supervisor())
                        .contentType("application/json")
                        .content(body("8", "7", "9", "7", "8", "7", "9", "8")))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.punctuality").value(8))
                .andExpect(jsonPath("$.overallGrade").value(8));
    }

    @Test
    void negativeScoreIsRejected() throws Exception {
        mockMvc.perform(post("/api/evaluations").with(supervisor())
                        .contentType("application/json")
                        .content(body("-1", "8", "8", "8", "8", "8", "8", "8")))
                .andExpect(status().is4xxClientError());
    }
}
