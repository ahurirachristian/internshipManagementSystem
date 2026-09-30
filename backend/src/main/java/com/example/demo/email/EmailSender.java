package com.example.demo.email;

/**
 * P2 (R1): email is an interface with two implementations — Resend in
 * production and a console/log sender in dev and CI, so tests never need a
 * network or an API key.
 */
public interface EmailSender {

    void send(String to, String subject, String html);
}
