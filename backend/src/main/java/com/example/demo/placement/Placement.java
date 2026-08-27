package com.example.demo.placement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "placements")
public class Placement {

    public enum Status {
        PENDING,
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
}
