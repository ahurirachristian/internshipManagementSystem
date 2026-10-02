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

/**
 * PC9 (D3, part 2): a student's application to a vacancy.
 *
 * <p>Links are stored as plain ids on purpose, mirroring {@link Placement}:
 * {@code vacancyId} points at the {@link Vacancy}, {@code companyId} is copied
 * from the vacancy at apply time (never taken from a request body — L8), and
 * {@code studentId} is the {@code students} row resolved from the acting
 * account.
 *
 * <p>The status is a Java enum rather than free text: PC9's contract is that
 * ONLY legal lifecycle transitions are possible, and a closed vocabulary is
 * what makes that enforceable server-side (the {@code DayDiary.status} free
 * text is the cautionary opposite).
 */
@Entity
@Table(name = "applications")
public class Application {

    public enum Status {
        /** Applied; the default for every new row. */
        SUBMITTED,
        /** The company has opened the application for review. */
        REVIEWING,
        /** Advanced to the company's shortlist. */
        SHORTLISTED,
        /** Accepted — terminal. */
        ACCEPTED,
        /** Rejected by the company — terminal. */
        REJECTED,
        /** Withdrawn by the student — terminal. */
        WITHDRAWN;

        public boolean isTerminal() {
            return this == ACCEPTED || this == REJECTED || this == WITHDRAWN;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.SUBMITTED;

    /** Stamped server-side when the student applies; never from the client. */
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Application() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVacancyId() {
        return vacancyId;
    }

    public void setVacancyId(Long vacancyId) {
        this.vacancyId = vacancyId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
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
}
