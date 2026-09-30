package com.example.demo.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * P2 (§8.3): the four transactional templates. Inline styles only, no external
 * assets, plain-text-safe copy.
 */
@Component
public class EmailTemplates {

    private final String baseUrl;

    public EmailTemplates(@Value("${app.base-url:http://localhost:3000}") String baseUrl) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    public String resetLink(String firstName, String username, String token) {
        String link = baseUrl + "/reset-password?token=" + token;
        return wrap(
                "Reset your password",
                "<p>Hi " + escape(safeName(firstName)) + ",</p>"
                        + "<p>We received a request to reset the password for your IMS account "
                        + "(<strong>" + escape(username) + "</strong>). Click the button below to choose a new one:</p>"
                        + button("Reset password", link)
                        + "<p>This link expires in <strong>30 minutes</strong> and can be used only once.</p>"
                        + "<p>If you didn&rsquo;t request a reset, you can safely ignore this email &mdash; "
                        + "your password will stay the same.</p>");
    }

    public String accountLocked(String firstName, String unlockTime) {
        return wrap(
                "Your IMS account was locked",
                "<p>Hi " + escape(safeName(firstName)) + ",</p>"
                        + "<p>We locked your account after too many failed sign-in attempts.</p>"
                        + "<p>It will unlock automatically at <strong>" + escape(unlockTime) + "</strong> (15 minutes).</p>"
                        + button("Reset your password", baseUrl + "/forgot-password")
                        + "<p>If this wasn&rsquo;t you, contact your administrator immediately.</p>");
    }

    public String passwordResetByAdmin(String firstName) {
        return wrap(
                "Your IMS password was reset",
                "<p>Hi " + escape(safeName(firstName)) + ",</p>"
                        + "<p>An administrator reset the password for your account.</p>"
                        + "<p>You will be asked to set a new password at your next sign-in.</p>");
    }

    public String credentialsIssued(String username) {
        return wrap(
                "Your IMS account is ready",
                "<p>Your account has been created.</p>"
                        + "<p>Username: <strong>" + escape(username) + "</strong><br/>"
                        + "Your temporary password was shared with you by your administrator.</p>"
                        + "<p>You will be asked to set a new password at your first sign-in.</p>"
                        + button("Sign in", baseUrl + "/login"));
    }

    private String safeName(String firstName) {
        return firstName == null || firstName.isBlank() ? "there" : firstName;
    }

    private String button(String label, String link) {
        return "<p style=\"text-align:center;margin:28px 0\">"
                + "<a href=\"" + escape(link) + "\" style=\"background:#2563eb;color:#ffffff;padding:12px 28px;"
                + "border-radius:6px;text-decoration:none;font-weight:bold\">" + escape(label) + "</a></p>";
    }

    private String wrap(String heading, String body) {
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937\">"
                + "<h2 style=\"color:#111827\">" + escape(heading) + "</h2>"
                + body
                + "<p style=\"color:#6b7280;font-size:12px\">Internship Management System &middot; "
                + "This is an automated message &mdash; please do not reply.</p></div>";
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
