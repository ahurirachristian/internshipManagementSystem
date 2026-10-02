package com.example.demo.placement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * PC8b: append-only record of every pipeline transition (offer, approve,
 * reject, start, complete).
 *
 * <p>Statuses are stored as plain strings rather than the {@code Placement.Status}
 * enum on purpose: history is an audit trail, and a row written today must stay
 * readable if the enum's vocabulary changes later (same lesson as the free-text
 * {@code DayDiary.status}, but here the writes are ours and type-safe at the
 * call sites).
 */
@Entity
@Table(name = "placement_status_history")
public class PlacementStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "placement_id", nullable = false)
    private Long placementId;

    /** NULL when the transition created the offer (no previous status). */
    @Column(name = "from_status")
    private String fromStatus;

    @Column(name = "to_status", nullable = false)
    private String toStatus;

    /** PC8b: nullable=false — every row is written with its own timestamp. */
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    /** Username of the acting account ("system" for anonymous legacy creates). */
    @Column(name = "changed_by")
    private String changedBy;

    public PlacementStatusHistory() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPlacementId() {
        return placementId;
    }

    public void setPlacementId(Long placementId) {
        this.placementId = placementId;
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

    public String getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(String changedBy) {
        this.changedBy = changedBy;
    }
}
