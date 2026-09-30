package com.example.demo.role;

import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** P3 (R4): every approvable thing is a row with a review trail. */
@Entity
@Table(name = "role_requests", indexes = {
        @Index(name = "idx_role_requests_user", columnList = "user_id"),
        @Index(name = "idx_role_requests_status", columnList = "status")
})
public class RoleRequest {

    public static final String PENDING = "PENDING";
    public static final String APPROVED = "APPROVED";
    public static final String DENIED = "DENIED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "requested_role", nullable = false, length = 16)
    private String requestedRole;

    @Column(name = "context_university_id", nullable = true)
    private Long contextUniversityId;

    @Column(name = "context_company_name", nullable = true, length = 200)
    private String contextCompanyName;

    @Column(nullable = false, length = 16)
    private String status = PENDING;

    @Column(name = "review_comment", nullable = true, length = 500)
    private String reviewComment;

    @Column(name = "reviewed_by", nullable = true)
    private Long reviewedBy;

    @Column(name = "reviewed_at", nullable = true)
    private LocalDateTime reviewedAt;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    public Long getId() { return id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getRequestedRole() { return requestedRole; }
    public void setRequestedRole(String requestedRole) { this.requestedRole = requestedRole; }

    public Long getContextUniversityId() { return contextUniversityId; }
    public void setContextUniversityId(Long contextUniversityId) { this.contextUniversityId = contextUniversityId; }

    public String getContextCompanyName() { return contextCompanyName; }
    public void setContextCompanyName(String contextCompanyName) { this.contextCompanyName = contextCompanyName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }

    public Long getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
}
