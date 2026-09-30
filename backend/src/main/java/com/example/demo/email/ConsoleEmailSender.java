package com.example.demo.email;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Dev/CI sender: logs the message and keeps an in-memory outbox so tests can
 * assert the reset link without touching the network (R1/L19).
 */
public class ConsoleEmailSender implements EmailSender {

    /** A captured message. */
    public record SentEmail(String to, String subject, String html) {
    }

    private static final Logger log = LoggerFactory.getLogger(ConsoleEmailSender.class);

    private final List<SentEmail> outbox = new ArrayList<>();

    @Override
    public synchronized void send(String to, String subject, String html) {
        outbox.add(new SentEmail(to, subject, html));
        log.info("[email:console] to={} subject={} body={}", to, subject, html);
    }

    public synchronized List<SentEmail> sentEmails() {
        return List.copyOf(outbox);
    }

    public synchronized SentEmail lastEmail() {
        return outbox.isEmpty() ? null : outbox.get(outbox.size() - 1);
    }

    public synchronized void clear() {
        outbox.clear();
    }
}
