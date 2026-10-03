package com.example.demo.placement;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * S3.1 (opportunity plan §6.1): the body of {@code POST /api/opportunities} — the
 * R8 field inventory of §5.2–§5.4 in one record.
 *
 * <p>Four fields are accepted <b>and never trusted</b>: {@code origin},
 * {@code status}, {@code companyId} and {@code verificationStatus} exist on this
 * record only so that a client which sends them gets the derived answer rather
 * than a silent drop — the service derives all four from the session role
 * [H5][H6][H8], and {@code OpportunitySubmissionTest} proves it by sending every
 * forged value and asserting what actually landed.
 *
 * <p>{@code sourceKind} and {@code sourceReference} are different: they are
 * evidence, not authority. A supervisor choosing between
 * {@code SUPERVISOR_SOURCED} (R6: proposes it, the university reviews) and
 * {@code UNIVERSITY_SOURCED} (R5: the university sources it itself, D2 says it
 * needs no super-admin hop) is an authorised persona picking between two
 * legitimate paths, not forging a higher-trust origin — the origin still derives
 * from the session, only which of the two supervisor origins it derives to
 * follows the evidence field.
 */
public record OpportunityCreateRequest(
        @NotBlank(message = "Title is required") @Size(max = 200) String title,
        @NotBlank(message = "Description is required") String description,
        @Size(max = 200) String location,
        String requirements,
        @NotNull(message = "Deadline is required") LocalDate deadline,

        // --- accepted, never trusted [H5][H6][H8] ---
        String origin,
        String status,
        Long companyId,
        String verificationStatus,

        String externalOrgName,
        String sourceKind,
        String sourceReference,

        // --- awareness (§5.2) ---
        String responsibilities,
        String deliverablesExpected,
        String benefits,
        String requiredSkills,
        String niceToHave,
        String toolsTechnologies,
        Boolean safetyOrientationRequired,
        String safetyNotes,

        // --- logistics (§5.3) ---
        String workMode,
        String country,
        String city,
        String addressDetail,
        Integer durationWeeks,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isPaid,
        BigDecimal stipendAmount,
        String stipendCurrency,
        String stipendPeriod,

        // --- targeting & capacity (§5.4): comma-separated Integer ids ---
        String targetSchoolIds,
        String targetDepartmentIds,
        String targetProgrammeIds,
        String targetYearOfStudy,
        String targetDegreeLevels,
        BigDecimal minCgpa,
        Integer slots,
        String eligibilityNotes,

        // --- contact ---
        String contactPersonName,
        String contactRole,
        String contactEmail,
        String contactPhone,

        // --- application ---
        String applicationInstructions,
        String applicationEmail,
        String applicationPhone,
        String applicationUrl,
        String requiredAttachments) {
}
