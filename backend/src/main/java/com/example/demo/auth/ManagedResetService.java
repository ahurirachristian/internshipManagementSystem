package com.example.demo.auth;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.email.EmailSender;
import com.example.demo.email.EmailTemplates;
import com.example.demo.notification.NotificationService;

/**
 * P2 (L21/D11): an admin (later: university/company within scope) resets an
 * account. A strong temp password is generated, hashed and returned ONCE in the
 * response; the target must change it at the next sign-in and all their older
 * sessions die via {@code password_changed_at} (L12).
 */
@Service
public class ManagedResetService {

    private static final Logger log = LoggerFactory.getLogger(ManagedResetService.class);
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final EmailSender emailSender;
    private final EmailTemplates emailTemplates;
    private final SecureRandom random = new SecureRandom();

    public ManagedResetService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            AuditLogService auditLogService, NotificationService notificationService,
            EmailSender emailSender, EmailTemplates emailTemplates) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.emailSender = emailSender;
        this.emailTemplates = emailTemplates;
    }

    @Transactional
    public String resetPassword(Long userId, UserEntity actor) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found."));
        String tempPassword = generateTempPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        userRepository.save(user);

        auditLogService.log(actor.getUsername(), actor.getRole().name(), "ACCOUNT_RESET",
                "User", "Password reset for account '" + user.getUsername() + "'", null);
        notificationService.notify(List.of(user.getId()), "ACCOUNT_RESET",
                "Your password was reset",
                "An administrator reset your password. You must set a new one at your next sign-in.",
                "/change-password");
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            try {
                emailSender.send(user.getEmail(), "Your IMS password was reset",
                        emailTemplates.passwordResetByAdmin(user.getUsername()));
            } catch (RuntimeException ex) {
                log.warn("managed reset email failed: {}", ex.getMessage());
            }
        }
        return tempPassword;
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder(16);
        for (int i = 0; i < 16; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
