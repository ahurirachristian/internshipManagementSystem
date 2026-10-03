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
 * One file attached to one advert (plan §5.11, step S1.5b).
 *
 * <p>This table exists because {@code documents} could not carry advert files, and
 * the reason is worth keeping here rather than only in the plan. {@code Document}'s
 * visibility is decided by {@code DocumentScopeService.findVisibleTo}, which keys on
 * exactly three things: whether the caller is an admin, the caller's {@code
 * universityId}, the caller's {@code companyId}, or whether they uploaded it. Its
 * {@code audience} column takes no part in the decision — it is a display string that
 * {@code FileController.toSummary} echoes back.
 *
 * <p>So an advert file in {@code documents} lands in one of two broken states. Scoped
 * to a university, it is readable by <i>every</i> student at that university, including
 * the ones a share never targeted in any programme. Scoped to neither, it is
 * super-admin-only, and no student ever sees the offer letter. Neither is R8. There is
 * no third option, because the predicate cannot express "these students at this
 * university", which is the only audience that matters here.
 *
 * <p>A separate table also leaves File Management alone. That predicate is shared with
 * a working feature with its own passing tests, and stretching it to cover a new
 * audience would put a working feature at risk for no benefit.
 *
 * <p><b>Storage and authorization are separate concerns.</b> {@code fileName} is a
 * server-generated UUID from {@code FileStorageService}, which also rejects any path
 * resolving outside the storage root — that is what closes path traversal [H14]. The
 * original name is kept separately for display. What a caller may <i>do</i> with the
 * file is never derived from either name: it comes from the audience resolver at S2.3,
 * the same resolver that decides whether they may read the advert. A file is never more
 * visible than its advert.
 */
@Entity
@Table(name = "opportunity_attachments",
        indexes = {
                @Index(name = "idx_opportunity_attachments_vacancy", columnList = "vacancy_id"),
                @Index(name = "idx_opportunity_attachments_university", columnList = "university_id")
        })
public class OpportunityAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vacancy_id", nullable = false)
    private Long vacancyId;

    /**
     * Null means an advert-level file: visible to the super admin and the advertising
     * side, and omitted from a student's listing entirely. Set means the file was
     * shared with one university's students, and the targeting columns below narrow
     * that further.
     */
    @Column(name = "university_id")
    private Long universityId;

    /** Narrows who may read the file, mirroring the share's targeting columns. */
    @Column(name = "target_programme_ids", length = 255)
    private String targetProgrammeIds;

    @Column(name = "target_year_of_study", length = 50)
    private String targetYearOfStudy;

    /** Server-generated UUID, never the client's filename. */
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    /** The name the uploader's browser supplied. Display only, never used on disk. */
    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

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

    public String getTargetProgrammeIds() {
        return targetProgrammeIds;
    }

    public void setTargetProgrammeIds(String targetProgrammeIds) {
        this.targetProgrammeIds = targetProgrammeIds;
    }

    public String getTargetYearOfStudy() {
        return targetYearOfStudy;
    }

    public void setTargetYearOfStudy(String targetYearOfStudy) {
        this.targetYearOfStudy = targetYearOfStudy;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Long uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
