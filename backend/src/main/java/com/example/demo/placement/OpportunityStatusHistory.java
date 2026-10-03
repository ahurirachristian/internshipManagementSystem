package com.example.demo.placement;

import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * One status transition on an advert or on one of its relay records (plan §5.10,
 * step S1.5).
 *
 * <p>This is the audit trail for all three relay types, and it exists because the
 * relay is a chain of decisions made by different people at different times: a super
 * admin verified it, offered it to four universities, one accepted, three declined,
 * one shared it, then closed it. When a student asks "why is this in my feed", the
 * answer is a row in here, not a reconstruction from current column values — those
 * only record where the advert ended up, never how it got there.
 *
 * <p><b>Statuses are stored as {@code String}, not the enum.</b> That is copied from
 * {@code PlacementStatusHistory} deliberately: the trail has to outlive the
 * vocabulary. An advert can be re-published, re-verified, or offered again after a
 * status is retired, and if the audit rows pointed at enum constants a vocabulary
 * change would either fail to insert or, worse, rewrite the meaning of history.
 * {@code relayType} is likewise a string, and {@code fromStatus} is nullable because
 * the first transition has no predecessor.
 *
 * <p>{@code universityId} is nullable for the same reason it is on the offer and
 * share tables: null means the transition was about the advert itself rather than
 * about one university's relationship to it.
 */
@Entity
@Table(name = "opportunity_status_history",
        indexes = {
                @Index(name = "idx_opportunity_status_history_vacancy_time",
                        columnList = "vacancy_id,changed_at"),
                @Index(name = "idx_opportunity_status_history_university",
                        columnList = "university_id")
        })
public class OpportunityStatusHistory {

    /** Which relay the transition belongs to; null for an advert-level transition. */
    public static final String RELAY_OFFER = "OFFER";
    public static final String RELAY_SHARE = "SHARE";
    public static final String RELAY_SUBMISSION = "SUBMISSION";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    /** Null when the transition was about the advert, not one university's link to it. */
    @Column(name = "university_id")
    private Long universityId;

    @Column(name = "relay_type", length = 16)
    private String relayType;

    /** Null on the first transition, which has no predecessor. */
    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

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

    public String getRelayType() {
        return relayType;
    }

    public void setRelayType(String relayType) {
        this.relayType = relayType;
    }

    public String getFromStatus() {
        return fromStatus;
    }

    public void setFromStatus(String fromStatus) {
        this.fromStatus = fromStatus;
    }

    public String getToStatus() {
        return toStatus;
    }

    public void setToStatus(String toStatus) {
        this.toStatus = toStatus;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
    }

    public Long getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(Long changedBy) {
        this.changedBy = changedBy;
    }
}
