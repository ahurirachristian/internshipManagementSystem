package com.example.demo.placement;

import java.util.List;

/**
 * S5.1 (opportunity plan §6.2): the body of
 * {@code POST /api/opportunities/{id}/offers} — the super admin naming which
 * universities an already-published advert goes to, and why.
 *
 * <p>There is deliberately nothing else on this record. No {@code vacancyId}
 * (it comes from the path), no {@code status} (an offer is born {@code OFFERED}),
 * no {@code offeredBy} (the session is the only identity the service trusts) —
 * the same "accepted, never trusted" shape as {@link OpportunityCreateRequest},
 * for the same reason: a client that sends them gets the derived answer rather
 * than a silent drop.
 *
 * <p>{@code note} is optional context (plan §5.7 calls it such) but, when present,
 * it is capped at 500 characters to match the column — a longer note would be a
 * database error rather than the 400 the caller can act on.
 *
 * @param universityIds the universities to offer to; every id must exist, the
 *                      list must be non-empty, and the {@code Long}→{@code Integer}
 *                      conversion to the university table happens once, in the
 *                      service (§2.5)
 * @param note optional super-admin context for the offer
 */
public record OpportunityOfferCreateRequest(List<Long> universityIds, String note) {
}
