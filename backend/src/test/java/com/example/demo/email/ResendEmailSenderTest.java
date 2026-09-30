package com.example.demo.email;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * P2 (§8.1): Resend requires a User-Agent header and a specific payload shape;
 * failures must never propagate into the user flow (§8.3).
 */
class ResendEmailSenderTest {

    @Test
    void sendsPayloadWithMandatoryHeaders() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("User-Agent", "ims-backend/1.0"))
                .andExpect(header("Authorization", "Bearer re_test"))
                .andExpect(jsonPath("$.from").value("ims@test.dev"))
                .andExpect(jsonPath("$.to[0]").value("student@example.com"))
                .andExpect(jsonPath("$.subject").value("Reset your IMS password"))
                .andExpect(jsonPath("$.html").value("<p>hi</p>"))
                .andRespond(withSuccess());

        new ResendEmailSender("re_test", "ims@test.dev", builder)
                .send("student@example.com", "Reset your IMS password", "<p>hi</p>");

        server.verify();
    }

    @Test
    void sendFailureDoesNotThrow() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.resend.com/emails")).andRespond(withServerError());

        new ResendEmailSender("re_test", "ims@test.dev", builder)
                .send("student@example.com", "subj", "<p>hi</p>");

        server.verify();
    }
}
