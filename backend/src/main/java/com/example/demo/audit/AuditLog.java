package com.example.demo.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * PC10 (D4): the audit trail, now indexed for the deferred admin activity
 * charts (plan §3.1).
 *
 * <p>Two indexes, one per read shape — and no behaviour change:
 * <ul>
 *   <li><b>{@code timestamp}</b> — the time-bucketed window every activity
 *       chart walks ({@code findByTimestampBetween}, and the {@code start}/{@code
 *       end} arm of {@code AuditLogController.search}). Without it a range over
 *       the whole history is a full scan.</li>
 *   <li><b>{@code (target_entity, username)}</b> — the composite the plan calls
 *       {@code (entity_type, user_id)}: "what did this account do to this
 *       entity". Leading column first so a query filtered only on
 *       {@code target_entity} can still use it as a prefix.</li>
 * </ul>
 *
 * <p>Index names are explicit because the PC10 test asserts on them in
 * {@code EXPLAIN} output — a generated name would make that assertion depend on
 * Hibernate's naming strategy rather than on this file.
 */
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_logs_entity_user", columnList = "target_entity, username")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String targetEntity;

    @Column
    private String details;

    @Column
    private String ipAddress;

    public AuditLog() {
    }

    public AuditLog(LocalDateTime timestamp, String username, String role, String action, String targetEntity, String details, String ipAddress) {
        this.timestamp = timestamp;
        this.username = username;
        this.role = role;
        this.action = action;
        this.targetEntity = targetEntity;
        this.details = details;
        this.ipAddress = ipAddress;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getTargetEntity() {
        return targetEntity;
    }

    public void setTargetEntity(String targetEntity) {
        this.targetEntity = targetEntity;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
}
