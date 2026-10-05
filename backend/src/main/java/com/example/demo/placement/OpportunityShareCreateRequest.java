package com.example.demo.placement;

import java.util.List;

/**
 * S6.3 (opportunity plan §6.3): the body of {@code POST /{id}/share} —
 * {@code {target:{programmeIds,departmentIds,yearsOfStudy}, note}}.
 *
 * <p>Everything tenancy-shaped is absent on purpose: there is no
 * {@code universityId} here because the sharing university is the session's
 * own [H7], and the targeting lists are plain numbers this endpoint then
 * checks twice — against the session university's own academic units [H7],
 * and against the advert's offered audience so the share can narrow it but
 * never widen it (§5.8).
 *
 * <p>{@code target} itself is optional: omitting it (or any list inside it)
 * means "the whole university", which is only legal while the advert is not
 * targeting anyone either. Ids are {@code Integer} to match the academic
 * tables (plan §2.5) and are stored as comma-separated strings on the share,
 * the same shape {@code Vacancy} uses.
 *
 * @param note    optional context from the university, capped at 500 chars
 * @param target  the audience narrowing, or null for the whole university
 */
public record OpportunityShareCreateRequest(String note, Target target) {

    /** Who at the university should see it — a subset of the advert's own targeting. */
    public record Target(List<Integer> programmeIds, List<Integer> departmentIds,
            List<Integer> yearsOfStudy) {
    }
}
