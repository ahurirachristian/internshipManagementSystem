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
 * One advert being offered to one university (plan §5.7, step S1.2).
 *
 * <p>This is the super-admin-to-university hop of the relay. A university cannot
 * see an advert just because it exists — it can only see adverts somebody
 * deliberately offered to it, which is what makes R3 selective rather than a
 * global broadcast.
 *
 * <p>Statuses are {@code String} constants rather than a nested enum because the
 * enum lands in S1.7; {@code OFFERED} → {@code ACCEPTED | DECLINED} →
 * {@code SHARED | CLOSED}. Transitions are validated by the transition service at
 * S2.1, not here, matching how {@code RoleRequest} leaves status to its service.
 *
 * <p>The {@code (vacancy_id, university_id)} unique constraint is the whole point
 * of the table: it is what makes a second offer the same pair a 409 rather than a
 * duplicate row that two inboxes would then both act on. Enforced in the schema
 * rather than only in service code so a race cannot slip past a check-then-insert.
 */
@Entity
@Table(name = "opportunity_offers",
        uniqueConstraints = @UniqueConstraint(name = "uq_opportunity_offers_vacancy_university",
                columnNames = { "vacancy_id", "university_id" }),
        indexes = {
                @Index(name = "idx_opportunity_offers_university_status",
                        columnList = "university_id,status"),
                @Index(name = "idx_opportunity_offers_vacancy", columnList = "vacancy_id")
        })
public class OpportunityOffer {

    public static final String OFFERED = "OFFERED";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String DECLINED = "DECLINED";
    public static final String SHARED = "SHARED";
    public static final String CLOSED = "CLOSED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Plain scalar rather than a {@code @ManyToOne} — house style throughout. */
    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    /**
     * {@code Long}, matching {@code users.university_id} and
     * {@code students.university_id}. Note that {@code University.universityId}
     * itself is an {@code Integer} (plan §2.5) — the conversion happens once, in
     * the service, never in a controller.
     */
    @Column(name = "university_id", nullable = false)
    private Long universityId;

    @Column(name = "status", nullable = false, length = 16)
    private String status = OFFERED;

    /** Optional context from the super admin; why this advert, why this university. */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "offered_by", nullable = false)
    private Long offeredBy;

    @Column(name = "offered_at", nullable = false)
    private LocalDateTime offeredAt = LocalDateTime.now();

    @Column(name = "responded_by")
    private Long respondedBy;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "response_note", length = 500)
    private String responseNote;

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

    public Long getOfferedBy() {
        return offeredBy;
    }

    public void setOfferedBy(Long offeredBy) {
        this.offeredBy = offeredBy;
    }

    public LocalDateTime getOfferedAt() {
        return offeredAt;
    }

    public void setOfferedAt(LocalDateTime offeredAt) {
        this.offeredAt = offeredAt;
    }

    public Long getRespondedBy() {
        return respondedBy;
    }

    public void setRespondedBy(Long respondedBy) {
        this.respondedBy = respondedBy;
    }

    public LocalDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(LocalDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }

    public String getResponseNote() {
        return responseNote;
    }

    public void setResponseNote(String responseNote) {
        this.responseNote = responseNote;
    }
}
