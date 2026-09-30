package com.example.demo.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * P2 (§8.2): when {@code RESEND_API_KEY} is set the real sender is used,
 * otherwise the console sender keeps dev and CI offline. Declaring the Resend
 * bean first lets {@code @ConditionalOnMissingBean} see it when configured.
 */
@Configuration
public class EmailConfig {

    @Bean
    @ConditionalOnExpression("'${resend.api-key:}'.trim().length() > 0 && '${app.email.disabled:false}'.equals('false')")
    public EmailSender resendEmailSender(@Value("${resend.api-key}") String apiKey,
            @Value("${resend.from-email:onboarding@resend.dev}") String fromEmail) {
        return new ResendEmailSender(apiKey, fromEmail);
    }

    @Bean
    @ConditionalOnMissingBean(EmailSender.class)
    public ConsoleEmailSender consoleEmailSender() {
        return new ConsoleEmailSender();
    }
}
