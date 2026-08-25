package com.example.demo.department;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * M0 stub: Chris's original hardcoded catalog rows are disabled to prevent
 * foreign-university data seeding. MIGRATION_PLAN.md M1 replaces this body
 * with the approved Nkumba + Kyambogo + Makerere catalog.
 */
@Component
@Order(6)
public class DepartmentDataSeeder implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // intentionally empty until M1
    }
}
