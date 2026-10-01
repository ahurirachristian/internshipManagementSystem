package com.example.demo.auth;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * PC7.1: startup verification for the INDUSTRIAL_SUPERVISOR role.
 *
 * <p>Before PC7 a field supervisor was stored as a {@code SUPERVISOR} row with
 * {@code company_id} set and {@code university_id} null — the shape that routed
 * them to the university dashboard, which rejected them on every request. The
 * canonical shape is now the {@code INDUSTRIAL_SUPERVISOR} role, but legacy
 * rows (created before the role existed) may still exist in databases that
 * predate the migration script. Because the local database provably holds none
 * (plan §1.4), there is no automatic rewrite — instead this check runs on
 * every boot and logs any row still wearing the legacy shape, so an operator
 * sees it at startup rather than discovering it through a user's broken login.
 *
 * <p>Read-only, off every request path: a false positive can only produce a
 * log line, never mutate data.
 */
@Component
@Order(34)
public class LegacyFieldSupervisorCheck implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyFieldSupervisorCheck.class);

    private final UserRepository userRepository;

    public LegacyFieldSupervisorCheck(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        List<UserEntity> legacy = userRepository
                .findByRoleAndCompanyIdIsNotNullAndUniversityIdIsNull(Role.SUPERVISOR);
        if (legacy.isEmpty()) {
            return;
        }
        List<String> usernames = legacy.stream().map(UserEntity::getUsername).toList();
        log.warn("Legacy field-supervisor shape found on {} SUPERVISOR row(s): {}. They still route "
                + "to the university dashboard and will be rejected there. Grant them the "
                + "INDUSTRIAL_SUPERVISOR role (with their company) or re-run "
                + "backend/migration/add_industrial_supervisor_role.sql pre-flight.",
                usernames.size(), usernames);
    }
}
