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

    @Column(nullable = false)
    private String universitySupervisor;

    @Column(nullable = false)
    private String companySupervisor;

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

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}
