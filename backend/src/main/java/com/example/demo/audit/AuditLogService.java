package com.example.demo.audit;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public AuditLog log(String username, String role, String action, String targetEntity, String details, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now());
        log.setUsername(username);
        log.setRole(role);
        log.setAction(action);
        log.setTargetEntity(targetEntity);
        log.setDetails(details);
        log.setIpAddress(ipAddress);
        return auditLogRepository.save(log);
    }

    public List<AuditLog> findAll() {
        return auditLogRepository.findAll();
    }

    public List<AuditLog> search(String action, String target, LocalDateTime start, LocalDateTime end) {
        return auditLogRepository.search(action, target, start, end);
    }
}
