package com.example.demo.placement;

import java.time.LocalDateTime;

/**
 * PC9: a single row of the applications list, enriched with the vacancy title
 * and the applicant's profile so the company can evaluate without a second
 * round trip.
 *
 * <p>Instances are only ever built inside {@link ApplicationService}'s scoped
 * queries — the DTO itself never decides who may see it; the scope does. That
 * is what keeps applicant PII out of a competing company's responses (the PC9
 * test asserts exactly that).
 */
public record ApplicationDto(
        Long id,
        Long vacancyId,
        String vacancyTitle,
        Long companyId,
        Long studentId,
        String status,
        LocalDateTime createdAt,
        String firstName,
        String lastName,
        String studentNumber,
        String registrationNumber,
        String degreeProgram,
        String email) {
}
