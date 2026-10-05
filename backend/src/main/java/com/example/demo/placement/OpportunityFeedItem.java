package com.example.demo.placement;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Step S6.4 (opportunity plan §6.4): one row of the student feed —
 * {@code GET /api/opportunities}.
 *
 * <p>A <b>record</b>, not the {@link Vacancy} entity (§2.6): the feed is a read
 * model scoped to <i>one viewer</i>, so it carries only what that viewer is
 * entitled to plus the metadata the plan requires to be zero-filled. The
 * {@code applied} flag and {@code applicationCount} are always present —
 * {@code false} / {@code 0} when there is nothing to count — so a chart or badge
 * beside the card interpolates nothing ({@code ApplicationFunnelDto.of} is the
 * precedent).
 *
 * <p>What is deliberately <b>not</b> here: any {@code companyId} (the student
 * sees the {@code externalOrgName} the advert was sourced with), verification
 * provenance, relay rows, and the on-disk shape of anything. The share fields
 * ({@code shareId}/{@code sharedAt}/{@code shareNote}) explain <i>why</i> this
 * advert is in front of this viewer — the share is the only reason it is.
 *
 * @param id               the advert's id — the same id {@code GET /{id}} takes
 * @param shareId          the share row that addressed this viewer's university
 * @param title            advert title
 * @param description      advert description (verbatim, never truncated server-side)
 * @param location         free-text location
 * @param externalOrgName  who is offering, when there is no company record
 * @param workMode         {@link Vacancy.WorkMode} name, or null when unset
 * @param deadline         application deadline, or null when the advert sets none
 * @param status           the advert's status — always {@code PUBLISHED} in the feed
 * @param sharedAt         when the university shared it (feed order key)
 * @param shareNote        the university's note to its own students, or null
 * @param applied          zero-filled: has <b>this</b> viewer applied?
 * @param applicationCount zero-filled: how many applications the advert holds
 */
public record OpportunityFeedItem(
        Long id,
        Long shareId,
        String title,
        String description,
        String location,
        String externalOrgName,
        String workMode,
        LocalDate deadline,
        String status,
        LocalDateTime sharedAt,
        String shareNote,
        boolean applied,
        int applicationCount) {
}
