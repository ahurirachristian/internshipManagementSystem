package com.example.demo.email;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/**
 * P2 (R1): posts to Resend's {@code POST /emails} endpoint (verified in §8.1 of
 * the plan). The mandatory {@code User-Agent} header is set explicitly because
 * Resend rejects requests without one (error 1010).
 */
public class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

    private final RestClient restClient;
    private final String fromEmail;

    public ResendEmailSender(String apiKey, String fromEmail) {
        this(apiKey, fromEmail, RestClient.builder());
    }

    /** Test seam: lets a MockRestServiceServer bind to the builder. */
    public ResendEmailSender(String apiKey, String fromEmail, RestClient.Builder builder) {
        this.fromEmail = fromEmail;
        this.restClient = builder
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("User-Agent", "ims-backend/1.0")
                .build();
    }

    @Override
    public void send(String to, String subject, String html) {
        try {
            restClient.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "from", fromEmail,
                            "to", List.of(to),
                            "subject", subject,
                            "html", html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ex) {
            // §8.3 failure policy: never block the user flow, never reveal delivery status.
            log.warn("Resend send failed for {}: {}", to, ex.getMessage());
        }
    }
}
