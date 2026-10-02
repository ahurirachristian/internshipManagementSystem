package com.example.demo.placement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "placements")
public class Placement {

    public enum Status {
        PENDING,
        /** P7: company offer awaiting university supervisor assignment. */
        OFFERED,
        ASSIGNED,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private Long companyId;

    @Column(name = "university_id", nullable = true)
    private Long universityId;

    @Column(nullable = false)
    private String universitySupervisor;

    @Column(nullable = false)
    private String companySupervisor;

    /**
     * M5: typed supervisor references alongside the legacy display strings.
     * The strings are dropped at M6c (MIGRATION_PLAN.md R1).
     */
    @Column(nullable = true)
    private Long universitySupervisorId;

    @Column(nullable = true)
    private Long companySupervisorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    /*
     * PC8b: the placement timeline. Every column is nullable on purpose — the
     * backfill policy is "never invent a date" (plan §PC8b): rows that predate
     * PC8b stay NULL and every query must EXCLUDE them rather than coerce them
     * to epoch, otherwise fabricated zeros would corrupt the PC12 charts.
     * createdAt defaults to now() for new rows only: Hibernate overwrites the
     * initializer with the stored NULL when loading a legacy row.
     */
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Set when the placement entered OFFERED (createOffer or the PC8a /offer step). */
    @Column(name = "offered_at")
    private LocalDateTime offeredAt;

    /** Set when the university approved: OFFERED → ASSIGNED. */
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    /** Set when the PC8a /start step ran: ASSIGNED → ACTIVE. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Set when the PC8a /complete step ran: ACTIVE → COMPLETED. */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public Placement() {
    }

    public Placement(Long studentId, Long companyId, String universitySupervisor, String companySupervisor, Status status) {
        this.studentId = studentId;
        this.companyId = companyId;
        this.universitySupervisor = universitySupervisor;
        this.companySupervisor = companySupervisor;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }

    public String getUniversitySupervisor() {
        return universitySupervisor;
    }

    public void setUniversitySupervisor(String universitySupervisor) {
        this.universitySupervisor = universitySupervisor;
    }

    public String getCompanySupervisor() {
        return companySupervisor;
    }

    public void setCompanySupervisor(String companySupervisor) {
        this.companySupervisor = companySupervisor;
    }

    public Long getUniversitySupervisorId() {
        return universitySupervisorId;
    }

    public void setUniversitySupervisorId(Long universitySupervisorId) {
        this.universitySupervisorId = universitySupervisorId;
    }

    public Long getCompanySupervisorId() {
        return companySupervisorId;
    }

    public void setCompanySupervisorId(Long companySupervisorId) {
        this.companySupervisorId = companySupervisorId;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getOfferedAt() {
        return offeredAt;
    }

    public void setOfferedAt(LocalDateTime offeredAt) {
        this.offeredAt = offeredAt;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
