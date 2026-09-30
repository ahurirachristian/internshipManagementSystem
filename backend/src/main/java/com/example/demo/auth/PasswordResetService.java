package com.example.demo.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.email.EmailSender;
import com.example.demo.email.EmailTemplates;

/**
 * P2 (R1, L1/L2/L10/L11): the reset token is generated with SecureRandom, only
 * its SHA-256 hash is stored, it expires after 30 minutes and is single-use.
 * Requests are throttled per user (10 min) and per IP (5/h).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    public static final String GENERIC_MESSAGE = "If that email exists, a reset link is on its way.";
    public static final String INVALID_TOKEN_MESSAGE = "RESET_LINK_INVALID_OR_EXPIRED";

    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    private static final Duration PER_USER_WINDOW = Duration.ofMinutes(10);
    private static final Duration PER_IP_WINDOW = Duration.ofHours(1);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final EmailTemplates templates;
    private final AuditLogService auditLogService;
    private final RateLimiter rateLimiter;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            EmailSender emailSender, EmailTemplates templates, AuditLogService auditLogService,
            RateLimiter rateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.templates = templates;
        this.auditLogService = auditLogService;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Looks-and-behaves generically (L2) for unknown/late requests.
     *
     * @return false only when the caller's IP is over the hard limit (→ 429);
     *         per-user throttling stays silent so it cannot be used as an oracle.
     */
    @Transactional
    public boolean requestReset(String email, String ipAddress) {
        if (!rateLimiter.tryAcquire("forgot-ip:" + ipAddress, 5, PER_IP_WINDOW)) {
            log.warn("forgot-password per-IP limit hit for {}", ipAddress);
            return false;
        }
        Optional<UserEntity> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty()) {
            return true;
        }
        UserEntity user = maybeUser.get();
        if (!rateLimiter.tryAcquire("forgot-user:" + user.getId(), 1, PER_USER_WINDOW)) {
            return true;
        }

        String rawToken = generateToken();
        user.setPasswordResetToken(sha256(rawToken));
        user.setPasswordResetExpiresAt(LocalDateTime.now().plus(TOKEN_TTL));
        userRepository.save(user);

        try {
            emailSender.send(email, "Reset your IMS password",
                    templates.resetLink(user.getUsername(), user.getUsername(), rawToken));
        } catch (RuntimeException ex) {
            log.warn("reset email dispatch failed: {}", ex.getMessage());
        }
        auditLogService.log(user.getUsername(), user.getRole().name(), "PASSWORD_RESET_REQUEST",
                "User", "Password reset link requested", ipAddress);
        return true;
    }

    /** @return true when the token was valid and the password was changed. */
    @Transactional
    public boolean resetPassword(String rawToken, String newPassword) {
        String hash = sha256(rawToken == null ? "" : rawToken.trim());
        return userRepository.findByPasswordResetToken(hash)
                .filter(user -> user.getPasswordResetExpiresAt() != null
                        && user.getPasswordResetExpiresAt().isAfter(LocalDateTime.now()))
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setPasswordResetToken(null);
                    user.setPasswordResetExpiresAt(null);
                    user.setPasswordChangedAt(LocalDateTime.now());
                    user.setMustChangePassword(false);
                    user.setFailedLoginAttempts(0);
                    user.setLockedUntil(null);
                    userRepository.save(user);
                    auditLogService.log(user.getUsername(), user.getRole().name(), "PASSWORD_RESET",
                            "User", "Password reset via emailed link", null);
                    return true;
                })
                .orElse(false);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
