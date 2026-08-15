package com.example.demo.audit;

import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize("hasAuthority('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String target,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        if (action != null || target != null || start != null || end != null) {
            LocalDateTime s = start != null ? start : LocalDateTime.now().minusDays(30);
            LocalDateTime e = end != null ? end : LocalDateTime.now();
            return ResponseEntity.ok(auditLogService.search(action, target, s, e));
        }
        return ResponseEntity.ok(auditLogService.findAll());
    }
}
