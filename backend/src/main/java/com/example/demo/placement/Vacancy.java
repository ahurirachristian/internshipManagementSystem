package com.example.demo.placement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonCreator;

@Entity
@Table(name = "vacancies")
public class Vacancy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    /**
     * Nullable as of the opportunity work: a sourced external offer (R2), a
     * university-sourced advert (R5) and a supervisor submission (R6) have no
     * company to point at, and they name the host in
     * {@link #externalOrgName} instead. This is the only column in the plan that
     * is loosened rather than added, so the rule that replaces the old
     * {@code NOT NULL} — company present, or an external name present — is
     * enforced when adverts are submitted, not here, because at this layer it
     * cannot tell which origin a row will end up claiming.
     */
    @Column(name = "company_id")
    private Long companyId;

    @Size(max = 200, message = "Location must be at most 200 characters")
    private String location;

    @Column(name = "requirements", columnDefinition = "TEXT")
    private String requirements;

    /**
     * The advert's lifecycle state. Was free text; became a closed vocabulary in
     * S1.7 because {@link #acceptsApplications()} has to be a decision about a
     * named state rather than a string comparison someone can typo.
     *
     * @see Status
     */
    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @NotNull(message = "Deadline is required")
    private LocalDate deadline;

    /** Stamped server-side on save; not required from the client. */
    private LocalDate createdAt;

    // --- Provenance and verification (plan §5.1) ---

    /**
     * Who put this advert here: COMPANY, SUPER_ADMIN, UNIVERSITY or SUPERVISOR.
     * Derived from the session role when an advert is created and never read from
     * the request body — the audience resolver branches on it, so a client-supplied
     * value would be a privilege escalation.
     */
    @Column(name = "origin", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Origin origin = Origin.COMPANY;

    /** The host organisation's name, for adverts with no company behind them. */
    @Size(max = 200, message = "External organisation name must be at most 200 characters")
    @Column(name = "external_org_name", length = 200)
    private String externalOrgName;

    /** COMPANY_DIRECT, EXTERNAL_OFFER, UNIVERSITY_SOURCED, SUPERVISOR_SOURCED or REFERRAL. */
    @Column(name = "source_kind", length = 24)
    @Enumerated(EnumType.STRING)
    private SourceKind sourceKind;

    /** A URL, a letter reference, or who referred it — the evidence for "legit offer". */
    @Size(max = 500, message = "Source reference must be at most 500 characters")
    @Column(name = "source_reference", length = 500)
    private String sourceReference;

    /**
     * UNVERIFIED, VERIFIED or REJECTED. Only a super admin moves an advert off
     * UNVERIFIED, and only for a company-submitted one: a company is the one
     * interested party in its own advert.
     */
    @Column(name = "verification_status", nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Size(max = 500, message = "Verification note must be at most 500 characters")
    @Column(name = "verification_note", length = 500)
    private String verificationNote;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Size(max = 500, message = "Review note must be at most 500 characters")
    @Column(name = "review_note", length = 500)
    private String reviewNote;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // --- Awareness and completeness (plan §5.2) ---

    @Column(name = "responsibilities", columnDefinition = "TEXT")
    private String responsibilities;

    /** What the student must hand over. Also what a supervisor assesses against later. */
    @Column(name = "deliverables_expected", columnDefinition = "TEXT")
    private String deliverablesExpected;

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "required_skills", columnDefinition = "TEXT")
    private String requiredSkills;

    @Column(name = "nice_to_have", columnDefinition = "TEXT")
    private String niceToHave;

    @Size(max = 500, message = "Tools and technologies must be at most 500 characters")
    @Column(name = "tools_technologies", length = 500)
    private String toolsTechnologies;

    /** A mandatory site briefing. False by default so an omitted field reads as false. */
    @Column(name = "safety_orientation_required", nullable = false)
    private Boolean safetyOrientationRequired = false;

    @Column(name = "safety_notes", columnDefinition = "TEXT")
    private String safetyNotes;

    // --- Logistics (plan §5.3) ---

    /** ONSITE, REMOTE or HYBRID. */
    @Column(name = "work_mode", nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    private WorkMode workMode = WorkMode.ONSITE;

    @Size(max = 100, message = "Country must be at most 100 characters")
    @Column(name = "country", length = 100)
    private String country;

    @Size(max = 100, message = "City must be at most 100 characters")
    @Column(name = "city", length = 100)
    private String city;

    @Size(max = 255, message = "Address detail must be at most 255 characters")
    @Column(name = "address_detail", length = 255)
    private String addressDetail;

    @Column(name = "duration_weeks")
    private Integer durationWeeks;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * Null means the advertiser never said. False means unpaid. Collapsing the
     * first two states would put a claim in the advert's mouth.
     */
    @Column(name = "is_paid")
    private Boolean isPaid;

    @Column(name = "stipend_amount", precision = 12, scale = 2)
    private BigDecimal stipendAmount;

    @Size(max = 3, message = "Stipend currency must be at most 3 characters")
    @Column(name = "stipend_currency", length = 3)
    private String stipendCurrency;

    /** MONTHLY, WEEKLY or TOTAL. */
    @Size(max = 16, message = "Stipend period must be at most 16 characters")
    @Column(name = "stipend_period", length = 16)
    private String stipendPeriod;

    // --- Targeting, capacity and contact (plan §5.4) ---
    //
    // Comma-separated id lists rather than a join table: the academic hierarchy
    // mixes Integer and Long ids (plan §2.5), and a row-per-target table would put
    // a type-conversion trap in the one place that has to be right. Converted once,
    // in the service, never in a controller.

    @Column(name = "target_school_ids", length = 255)
    private String targetSchoolIds;

    @Column(name = "target_department_ids", length = 255)
    private String targetDepartmentIds;

    @Column(name = "target_programme_ids", length = 255)
    private String targetProgrammeIds;

    @Column(name = "target_year_of_study", length = 50)
    private String targetYearOfStudy;

    @Column(name = "target_degree_levels", length = 255)
    private String targetDegreeLevels;

    @Column(name = "min_cgpa", precision = 4, scale = 2)
    private BigDecimal minCgpa;

    @Column(name = "slots")
    private Integer slots;

    @Column(name = "eligibility_notes", columnDefinition = "TEXT")
    private String eligibilityNotes;

    @Size(max = 150, message = "Contact name must be at most 150 characters")
    @Column(name = "contact_person_name", length = 150)
    private String contactPersonName;

    @Size(max = 100, message = "Contact role must be at most 100 characters")
    @Column(name = "contact_role", length = 100)
    private String contactRole;

    @Size(max = 200, message = "Contact email must be at most 200 characters")
    @Column(name = "contact_email", length = 200)
    private String contactEmail;

    @Size(max = 50, message = "Contact phone must be at most 50 characters")
    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "application_instructions", columnDefinition = "TEXT")
    private String applicationInstructions;

    @Size(max = 200, message = "Application email must be at most 200 characters")
    @Column(name = "application_email", length = 200)
    private String applicationEmail;

    @Size(max = 50, message = "Application phone must be at most 50 characters")
    @Column(name = "application_phone", length = 50)
    private String applicationPhone;

    @Size(max = 500, message = "Application URL must be at most 500 characters")
    @Column(name = "application_url", length = 500)
    private String applicationUrl;

    /** What the applicant must attach. The files themselves live in opportunity_attachments. */
    @Column(name = "required_attachments", columnDefinition = "TEXT")
    private String requiredAttachments;

    // --- The closed vocabularies (plan §5.6, step S1.7) ---

    /**
     * The advert lifecycle.
     *
     * <pre>
     * PENDING_REVIEW --verify--&gt; PUBLISHED --&gt; CLOSED
     *       |  ^                   |  ^            |
     *       |  | re-submit         |  |            +-- EXPIRED (deadline passed, computed)
     *       +--+ REJECTED --------+  +-- WITHDRAWN (originator pulls it)
     * </pre>
     *
     * <p><b>{@code "OPEN"} is still accepted as an alias of {@link #PUBLISHED}.</b>
     * Every advert row in the production database carries that string, every
     * {@code POST /api/vacancies} body carries it, and every existing test passes it
     * to the constructor. Renaming the vocabulary without the alias would 400 all of
     * them at once, so the alias is the compatibility layer — not a second state, and
     * {@link #PUBLISHED} is the only thing it resolves to.
     *
     * <p><b>What the alias does not do is keep the apply path alive.</b> The apply
     * gate used to be:
     *
     * <pre>
     * if (!"OPEN".equalsIgnoreCase(vacancy.getStatus())) { throw ... }
     * </pre>
     *
     * That protects rows <i>already written</i> as {@code "OPEN"}. It does nothing
     * for rows written <i>after</i> this change: a super-admin-published advert
     * carries {@code "PUBLISHED"}, and {@code "OPEN".equalsIgnoreCase("PUBLISHED")}
     * is false. So the alias plus the old gate together would make every correctly
     * published opportunity unappliable — a 409 on apply with no compile error and no
     * failing test, because every apply test uses the legacy fixture. That is why the
     * gate now asks {@link #acceptsApplications()} and why
     * {@code ApplicationAdvertStatusGateTest} was inverted in the same commit.
     */
    public enum Status {
        /** Submitted and not yet seen by a moderator. The private state of R1. */
        PENDING_REVIEW,
        /** Verified and live. */
        PUBLISHED,
        /** Turned down. Terminal. */
        REJECTED,
        /** Withdrawn by whoever put it up. Terminal. */
        WITHDRAWN,
        /** Wound down deliberately. Terminal. */
        CLOSED,
        /** Deadline passed. Computed from the deadline, never stored. Terminal. */
        EXPIRED;

        /** The pre-enum spelling of {@link #PUBLISHED}, still accepted on the wire. */
        public static final String LEGACY_OPEN = "OPEN";

        /**
         * The statuses a student may apply to.
         *
         * <p>{@link #PUBLISHED} alone, deliberately. {@link #PENDING_REVIEW} is
         * exactly the state R1 keeps private, so admitting it would make the
         * moderation step decoration.
         */
        private static final Set<Status> OPEN_TO_APPLICATIONS = EnumSet.of(PUBLISHED);

        /**
         * Parses a stored or submitted status, accepting the legacy {@code "OPEN"}.
         *
         * <p>Case- and whitespace-tolerant on purpose: the gate this replaces used
         * {@code equalsIgnoreCase}, so a lower-case {@code "open"} row was admissible
         * and taking it out of service now would be a live advert losing its
         * applicants for no good reason.
         *
         * <p>Unknown values are a 400 rather than a 409. That is a real behaviour
         * change and a deliberate one: an unrecognised status used to be
         * indistinguishable from a closed advert, so a typo in a request body was
         * reported as "no longer open", which is both wrong and unhelpful.
         *
         * @throws IllegalArgumentException on anything unrecognised, which the global
         *         handler renders as a 400
         */
        @JsonCreator
        public static Status parse(String raw) {
            if (raw == null || raw.isBlank()) {
                throw new IllegalArgumentException("Status is required.");
            }
            String normalised = raw.trim().toUpperCase(Locale.ROOT);
            if (LEGACY_OPEN.equals(normalised)) {
                return PUBLISHED;
            }
            try {
                return Status.valueOf(normalised);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown advert status: " + raw);
            }
        }

        /**
         * True when a student may apply to an advert in this state.
         *
         * <p>This is the apply gate. It is a method on the enum so the answer lives
         * next to the states it is a question about, rather than in a service that
         * can drift from them.
         */
        public boolean acceptsApplications() {
            return OPEN_TO_APPLICATIONS.contains(this);
        }
    }

    /**
     * Who put the advert here. The audience resolver branches on this, so it is a
     * closed set rather than free text — an unrecognised origin must not be able to
     * fall through to a default audience.
     */
    public enum Origin {
        /** A company posting its own advert. The only origin needing verification (D2). */
        COMPANY,
        /** A moderator, who is trusted by definition. */
        SUPER_ADMIN,
        /** A university sourcing an advert itself (R5). */
        UNIVERSITY,
        /** A supervisor forwarding one to a university (R6). */
        SUPERVISOR
    }

    /** The legitimacy verdict on an advert, with the judge and reason recorded. */
    public enum VerificationStatus {
        UNVERIFIED,
        VERIFIED,
        REJECTED
    }

    /** How the role is performed. */
    public enum WorkMode {
        ONSITE,
        REMOTE,
        HYBRID
    }

    /** Where the advert's content came from. */
    public enum SourceKind {
        COMPANY_DIRECT,
        EXTERNAL_OFFER,
        UNIVERSITY_SOURCED,
        SUPERVISOR_SOURCED,
        REFERRAL
    }

    public Vacancy() {
    }

    /**
     * The legacy constructor, kept so the existing fixtures keep compiling and the
     * {@code "OPEN"} they pass still lands on {@link Status#PUBLISHED}. The {@code String}
     * parameter is deliberate: narrowing it to {@code Status} would force every caller
     * to be edited for no gain, and would lose the one place the alias is exercised.
     */
    public Vacancy(String title, String description, Long companyId, String location, String requirements, String status, LocalDate deadline, LocalDate createdAt) {
        this.title = title;
        this.description = description;
        this.companyId = companyId;
        this.location = location;
        this.requirements = requirements;
        this.status = Status.parse(status);
        this.deadline = deadline;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getRequirements() {
        return requirements;
    }

    public void setRequirements(String requirements) {
        this.requirements = requirements;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }

    public Origin getOrigin() {
        return origin;
    }

    public void setOrigin(Origin origin) {
        this.origin = origin;
    }

    public String getExternalOrgName() {
        return externalOrgName;
    }

    public void setExternalOrgName(String externalOrgName) {
        this.externalOrgName = externalOrgName;
    }

    public SourceKind getSourceKind() {
        return sourceKind;
    }

    public void setSourceKind(SourceKind sourceKind) {
        this.sourceKind = sourceKind;
    }

    public String getSourceReference() {
        return sourceReference;
    }

    public void setSourceReference(String sourceReference) {
        this.sourceReference = sourceReference;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public Long getVerifiedBy() {
        return verifiedBy;
    }

    public void setVerifiedBy(Long verifiedBy) {
        this.verifiedBy = verifiedBy;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public String getVerificationNote() {
        return verificationNote;
    }

    public void setVerificationNote(String verificationNote) {
        this.verificationNote = verificationNote;
    }

    public LocalDateTime getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(LocalDateTime publishedAt) {
        this.publishedAt = publishedAt;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getResponsibilities() {
        return responsibilities;
    }

    public void setResponsibilities(String responsibilities) {
        this.responsibilities = responsibilities;
    }

    public String getDeliverablesExpected() {
        return deliverablesExpected;
    }

    public void setDeliverablesExpected(String deliverablesExpected) {
        this.deliverablesExpected = deliverablesExpected;
    }

    public String getBenefits() {
        return benefits;
    }

    public void setBenefits(String benefits) {
        this.benefits = benefits;
    }

    public String getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(String requiredSkills) {
        this.requiredSkills = requiredSkills;
    }

    public String getNiceToHave() {
        return niceToHave;
    }

    public void setNiceToHave(String niceToHave) {
        this.niceToHave = niceToHave;
    }

    public String getToolsTechnologies() {
        return toolsTechnologies;
    }

    public void setToolsTechnologies(String toolsTechnologies) {
        this.toolsTechnologies = toolsTechnologies;
    }

    public Boolean getSafetyOrientationRequired() {
        return safetyOrientationRequired;
    }

    public void setSafetyOrientationRequired(Boolean safetyOrientationRequired) {
        this.safetyOrientationRequired = safetyOrientationRequired;
    }

    public String getSafetyNotes() {
        return safetyNotes;
    }

    public void setSafetyNotes(String safetyNotes) {
        this.safetyNotes = safetyNotes;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public void setWorkMode(WorkMode workMode) {
        this.workMode = workMode;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getAddressDetail() {
        return addressDetail;
    }

    public void setAddressDetail(String addressDetail) {
        this.addressDetail = addressDetail;
    }

    public Integer getDurationWeeks() {
        return durationWeeks;
    }

    public void setDurationWeeks(Integer durationWeeks) {
        this.durationWeeks = durationWeeks;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Boolean getIsPaid() {
        return isPaid;
    }

    public void setIsPaid(Boolean isPaid) {
        this.isPaid = isPaid;
    }

    public BigDecimal getStipendAmount() {
        return stipendAmount;
    }

    public void setStipendAmount(BigDecimal stipendAmount) {
        this.stipendAmount = stipendAmount;
    }

    public String getStipendCurrency() {
        return stipendCurrency;
    }

    public void setStipendCurrency(String stipendCurrency) {
        this.stipendCurrency = stipendCurrency;
    }

    public String getStipendPeriod() {
        return stipendPeriod;
    }

    public void setStipendPeriod(String stipendPeriod) {
        this.stipendPeriod = stipendPeriod;
    }

    public String getTargetSchoolIds() {
        return targetSchoolIds;
    }

    public void setTargetSchoolIds(String targetSchoolIds) {
        this.targetSchoolIds = targetSchoolIds;
    }

    public String getTargetDepartmentIds() {
        return targetDepartmentIds;
    }

    public void setTargetDepartmentIds(String targetDepartmentIds) {
        this.targetDepartmentIds = targetDepartmentIds;
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

    public String getTargetDegreeLevels() {
        return targetDegreeLevels;
    }

    public void setTargetDegreeLevels(String targetDegreeLevels) {
        this.targetDegreeLevels = targetDegreeLevels;
    }

    public BigDecimal getMinCgpa() {
        return minCgpa;
    }

    public void setMinCgpa(BigDecimal minCgpa) {
        this.minCgpa = minCgpa;
    }

    public Integer getSlots() {
        return slots;
    }

    public void setSlots(Integer slots) {
        this.slots = slots;
    }

    public String getEligibilityNotes() {
        return eligibilityNotes;
    }

    public void setEligibilityNotes(String eligibilityNotes) {
        this.eligibilityNotes = eligibilityNotes;
    }

    public String getContactPersonName() {
        return contactPersonName;
    }

    public void setContactPersonName(String contactPersonName) {
        this.contactPersonName = contactPersonName;
    }

    public String getContactRole() {
        return contactRole;
    }

    public void setContactRole(String contactRole) {
        this.contactRole = contactRole;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getApplicationInstructions() {
        return applicationInstructions;
    }

    public void setApplicationInstructions(String applicationInstructions) {
        this.applicationInstructions = applicationInstructions;
    }

    public String getApplicationEmail() {
        return applicationEmail;
    }

    public void setApplicationEmail(String applicationEmail) {
        this.applicationEmail = applicationEmail;
    }

    public String getApplicationPhone() {
        return applicationPhone;
    }

    public void setApplicationPhone(String applicationPhone) {
        this.applicationPhone = applicationPhone;
    }

    public String getApplicationUrl() {
        return applicationUrl;
    }

    public void setApplicationUrl(String applicationUrl) {
        this.applicationUrl = applicationUrl;
    }

    public String getRequiredAttachments() {
        return requiredAttachments;
    }

    public void setRequiredAttachments(String requiredAttachments) {
        this.requiredAttachments = requiredAttachments;
    }
}
