package com.example.demo.audit;

import java.time.LocalDateTime;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(14)
public class AuditLogDataSeeder implements CommandLineRunner {

    private final AuditLogRepository auditLogRepository;

    public AuditLogDataSeeder(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void run(String... args) {
        if (auditLogRepository.count() == 0) {
            auditLogRepository.save(new AuditLog(
                LocalDateTime.of(2026, 8, 19, 9, 0), "admin", "ADMIN", "LOGIN", "User", "Admin logged in", "127.0.0.1"));
            auditLogRepository.save(new AuditLog(
                LocalDateTime.of(2026, 8, 19, 9, 5), "admin", "ADMIN", "CREATE", "Company", "Created company: Airtel Uganda", "127.0.0.1"));
            auditLogRepository.save(new AuditLog(
                LocalDateTime.of(2026, 8, 19, 9, 10), "admin", "ADMIN", "CREATE", "Company", "Created company: MTN Uganda", "127.0.0.1"));
            auditLogRepository.save(new AuditLog(
                LocalDateTime.of(2026, 8, 19, 10, 0), "2400101003", "STUDENT", "LOGIN", "User", "Student logged in", "127.0.0.1"));
            auditLogRepository.save(new AuditLog(
                LocalDateTime.of(2026, 8, 20, 8, 30), "2400101003", "STUDENT", "CREATE", "DayDiary", "Created diary entry for 2026-08-19", "127.0.0.1"));
        }
    }
}
