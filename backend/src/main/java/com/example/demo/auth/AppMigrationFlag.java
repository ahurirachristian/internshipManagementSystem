package com.example.demo.auth;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One-time data-migration marker. A row here means "this repair already ran";
 * boot-time runners check the flag instead of re-applying a fix that could
 * undo deliberate operator actions (e.g. re-enabling an account a super admin
 * disabled on purpose).
 */
@Entity
@Table(name = "app_migration_flags")
public class AppMigrationFlag {

    @Id
    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    public AppMigrationFlag() {
    }

    public AppMigrationFlag(String name) {
        this.name = name;
        this.appliedAt = LocalDateTime.now();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(LocalDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }
}
