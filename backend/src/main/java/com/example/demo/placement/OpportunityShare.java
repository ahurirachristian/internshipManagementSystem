package com.example.demo.placement;

import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * One advert being shared with one university's students (plan §5.8, step S1.3).
 *
 * <p>This is the hop that decides what a student actually sees, so it carries two
 * things the offer row does not: an optional link back to the offer that authorised
 * it, and its own copy of the targeting columns.
 *
 * <p><b>Why the targeting columns are duplicated here.</b> The advert carries
 * targeting for the whole relay, and an offer can narrow it. A university sharing
 * downward may narrow the audience further — "third years only", "this programme
 * only" — but must never widen it back out. Keeping the share's own copy makes
 * that comparison a plain column read against the offer it descends from, rather
 * than a reconstruction of what the super admin originally asked for. The
 * comparison itself belongs to S6.3, where the transition service is; this table
 * only has to hold both sides of it.
 *
 * <p>Stored as comma-separated id strings, matching {@code Vacancy}'s
 * {@code target_programme_ids} rather than a row-per-target table, because the
 * academic hierarchy mixes {@code Integer} and {@code Long} ids (plan §2.5) and a
 * join table would put a type trap in the one place that must be right. Parsed
 * once in the service.
 *
 * <p>{@code offerId} is null when the university sourced the advert itself (R5) or
 * when a supervisor's submission was approved (R6) — in both cases there was no
 * offer to descend from, and a non-null value there would falsely claim super-admin
 * involvement that never happened.
 */
@Entity
@Table(name = "opportunity_shares",
        uniqueConstraints = @UniqueConstraint(name = "uq_opportunity_shares_vacancy_university",
                columnNames = { "vacancy_id", "university_id" }),
        indexes = {
                @Index(name = "idx_opportunity_shares_university_status",
                        columnList = "university_id,status"),
                @Index(name = "idx_opportunity_shares_vacancy", columnList = "vacancy_id")
        })
public class OpportunityShare {

    public static final String SHARED = "SHARED";
    public static final String CLOSED = "CLOSED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    /** {@code Long}, matching {@code users.university_id}. Forced from the session. */
    @Column(name = "university_id", nullable = false)
    private Long universityId;

    /**
     * The offer that authorised this share, or null when the university sourced the
     * advert itself (R5) or approved a supervisor's submission (R6). Null is
     * meaningful, not merely absent: it records that no super admin was involved.
     */
    @Column(name = "offer_id")
    private Long offerId;

    @Column(name = "status", nullable = false, length = 16)
    private String status = SHARED;

    /** Optional context from the university to its own supervisors and students. */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "shared_by", nullable = false)
    private Long sharedBy;

    @Column(name = "shared_at", nullable = false)
    private LocalDateTime sharedAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by")
    private Long closedBy;

    // --- Targeting, duplicated from the advert so a share can narrow it ---

    @Column(name = "target_programme_ids", length = 255)
    private String targetProgrammeIds;

    @Column(name = "target_department_ids", length = 255)
    private String targetDepartmentIds;

    @Column(name = "target_year_of_study", length = 50)
    private String targetYearOfStudy;

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

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }

    public Long getOfferId() {
        return offerId;
    }

    public void setOfferId(Long offerId) {
        this.offerId = offerId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Long getSharedBy() {
        return sharedBy;
    }

    public void setSharedBy(Long sharedBy) {
        this.sharedBy = sharedBy;
    }

    public LocalDateTime getSharedAt() {
        return sharedAt;
    }

    public void setSharedAt(LocalDateTime sharedAt) {
        this.sharedAt = sharedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(LocalDateTime closedAt) {
        this.closedAt = closedAt;
    }

    public Long getClosedBy() {
        return closedBy;
    }

    public void setClosedBy(Long closedBy) {
        this.closedBy = closedBy;
    }

    public String getTargetProgrammeIds() {
        return targetProgrammeIds;
    }

    public void setTargetProgrammeIds(String targetProgrammeIds) {
        this.targetProgrammeIds = targetProgrammeIds;
    }

    public String getTargetDepartmentIds() {
        return targetDepartmentIds;
    }

    public void setTargetDepartmentIds(String targetDepartmentIds) {
        this.targetDepartmentIds = targetDepartmentIds;
    }

    public String getTargetYearOfStudy() {
        return targetYearOfStudy;
    }

    public void setTargetYearOfStudy(String targetYearOfStudy) {
        this.targetYearOfStudy = targetYearOfStudy;
    }
}
