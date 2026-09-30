package com.example.demo.auth;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Login fix: rows predating the {@code enabled} column (or left behind by an
 * older stack) never re-enter the seeder's insert path, so a legacy database
 * keeps seed accounts with {@code enabled = 0} — the AuthorityRefreshFilter
 * then kills every non-admin session right after login. This runner re-enables
 * the known seed accounts EXACTLY ONCE, guarded by an {@link AppMigrationFlag},
 * so a disable performed later by a super admin (R6) is never undone by a
 * restart. Only the seven seed usernames are touched; operator-disabled
 * non-seed accounts are left alone.
 */
@Component
@Order(33)
public class LegacyAccountHealRunner implements CommandLineRunner {

    public static final String FLAG_NAME = "legacy-accounts-enabled-heal-v1";

    private static final Logger log = LoggerFactory.getLogger(LegacyAccountHealRunner.class);

    private final AppMigrationFlagRepository flagRepository;
    private final UserRepository userRepository;

    public LegacyAccountHealRunner(AppMigrationFlagRepository flagRepository, UserRepository userRepository) {
        this.flagRepository = flagRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (flagRepository.existsByName(FLAG_NAME)) {
            return;
        }
        java.util.concurrent.atomic.AtomicInteger healed = new java.util.concurrent.atomic.AtomicInteger();
        for (String username : List.of("2400101003", "STU-2026-001", "STU-2026-002",
                "university", "kyu", "airtel", "admin")) {
            userRepository.findByUsername(username).ifPresent(user -> {
                if (!Boolean.TRUE.equals(user.getEnabled())) {
                    user.setEnabled(true);
                    userRepository.save(user);
                    healed.incrementAndGet();
                }
            });
        }
        flagRepository.save(new AppMigrationFlag(FLAG_NAME));
        log.info("Legacy account heal applied ({} of 7 seed usernames re-enabled) and flagged as {}",
                healed.get(), FLAG_NAME);
    }
}
