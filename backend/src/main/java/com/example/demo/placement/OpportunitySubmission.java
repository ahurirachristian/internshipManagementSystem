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
 * A supervisor submitting a found advert to their university for approval (plan §5.9,
 * step S1.4).
 *
 * <p>This is R6's first half and the only origin where the university is a
 * <i>reviewer</i> rather than a trusted verifier: the supervisor found something, and
 * a university supervisor decides whether it goes in front of students. The second half
 * of R6 is a share, which is blocked until this row reads {@code APPROVED}.
 *
 * <p>The {@code (vacancy_id)} unique constraint is unusual and worth stating plainly,
 * because it looks like a copy-paste slip from the offer and share tables and is not.
 * An advert may be offered to many universities and shared with many universities;
 * it may be <b>submitted</b> by exactly one supervisor, ever. Two supervisors at two
 * different universities both forwarding the same advert would produce two review
 * queues, two approval decisions that could disagree, and then two shares of one
 * advert. R5 already covers a university sourcing an advert itself, so nobody is
 * blocked by this — they use a share with a null {@code offerId} instead.
 */
@Entity
@Table(name = "opportunity_submissions",
        uniqueConstraints = @UniqueConstraint(name = "uq_opportunity_submissions_vacancy",
                columnNames = "vacancy_id"),
        indexes = {
                @Index(name = "idx_opportunity_submissions_university_status",
                        columnList = "university_id,status"),
                @Index(name = "idx_opportunity_submissions_submitter",
                        columnList = "submitted_by")
        })
public class OpportunitySubmission {

    public static final String PENDING = "PENDING";
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    /**
     * Forced from the session at S5.2, never read from the request body ([H7]). A
     * supervisor may only submit to their own university, so this column is a record
     * of where the submission went rather than a routing decision.
     */
    @Column(name = "university_id", nullable = false)
    private Long universityId;

    @Column(name = "submitted_by", nullable = false)
    private Long submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt = LocalDateTime.now();

    @Column(name = "status", nullable = false, length = 16)
    private String status = PENDING;

    /** The supervisor's own pitch: where they found it, why it suits this cohort. */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", length = 500)
    private String reviewNote;

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

    public Long getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(Long submittedBy) {
        this.submittedBy = submittedBy;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
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

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Long reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }
}
