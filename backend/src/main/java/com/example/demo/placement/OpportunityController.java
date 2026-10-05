package com.example.demo.placement;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * S3.1/S3.3 (opportunity plan §6.1): the opportunity surface —
 * {@code POST /api/opportunities}, gated to the three personas the brief lets
 * put an advert into the system ({@code COMPANY}, {@code SUPERVISOR},
 * {@code ADMIN}), {@code GET /mine} for the two personas that have
 * "their own" to read ({@code COMPANY}, {@code SUPERVISOR}), and
 * {@code GET /inbox} for the one persona that judges everyone's submissions
 * (S4.1: the {@code super_admin} flag, not the {@code ADMIN} role). Students, field
 * supervisors and admins are refused at the door with a 403 before any tenancy
 * question is asked.
 *
 * <p>The controller does one thing beyond routing: it resolves the <b>session</b>
 * user as the only identity the service trusts. No origin, company or
 * university ever arrives over the wire [H5][H8]. A principal with no database
 * row cannot be placed in any tenancy at all, so it is denied rather than
 * defaulted — an unattributable submission is exactly what an audit trail must
 * not contain.
 */
@RestController
@RequestMapping("/api/opportunities")
public class OpportunityController {

    private final OpportunityService opportunityService;
    private final OpportunityTransitionService opportunityTransitionService;
    private final UserRepository userRepository;

    public OpportunityController(OpportunityService opportunityService,
            OpportunityTransitionService opportunityTransitionService, UserRepository userRepository) {
        this.opportunityService = opportunityService;
        this.opportunityTransitionService = opportunityTransitionService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<Vacancy> create(@Valid @RequestBody OpportunityCreateRequest request,
            Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A submission must come from a known session.");
        }
        Vacancy saved = opportunityService.create(actor, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * S3.3: my submissions — the company's own adverts, the supervisor's own
     * proposals. Students, field supervisors and admins are refused at the door;
     * what's inside is scoped by the session, so a rival's rows never leave the
     * server for the wrong caller [H1].
     */
    @GetMapping("/mine")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR')")
    public ResponseEntity<List<Vacancy>> mySubmissions(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A submission list must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listMine(actor));
    }

    /**
     * S4.1: the moderation inbox — super-admin only. {@code STUDENT},
     * {@code SUPERVISOR} and {@code COMPANY} are refused by the authority gate
     * before any query runs, which is R1 in one line: a student cannot see a
     * company's submission, not even its existence. A plain {@code ADMIN}
     * passes this gate and is then refused by the service for lacking the
     * {@code super_admin} flag [H6].
     */
    @GetMapping("/inbox")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<Vacancy>> inbox(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A moderation inbox must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listInbox(actor));
    }

    /**
     * S4.2: one verb, one closed map — {@code POST /{id}/transition}. The door
     * admits the three personas that can move an advert at all (the moderator
     * verifying it, the originator pulling it); students and field supervisors
     * are refused before any id exists. Everything past the door is the
     * engine's: scope 404, role 403 [H6], legality 409, and for a
     * verify/reject verdict a required {@code verificationNote} (400 when
     * missing — D7). Both spellings of the note key are accepted so the
     * plan's {@code verification_note} and the API's camelCase agree.
     */
    @PostMapping("/{id}/transition")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY', 'SUPERVISOR')")
    public ResponseEntity<?> transition(@PathVariable Long id, @RequestBody Map<String, String> body,
            Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A transition must come from a known session.");
        }
        String target = body.get("status");
        if (target == null || target.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A target status is required."));
        }
        Vacancy.Status status;
        try {
            status = Vacancy.Status.parse(target.trim());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown status: " + target));
        }
        String note = body.get("verificationNote") != null
                ? body.get("verificationNote")
                : body.get("verification_note");
        return ResponseEntity.ok(opportunityTransitionService.transitionAdvert(actor, id, status, note));
    }

    /**
     * S5.1 (plan §6.2): {@code POST /{id}/offers} — the super-admin broadcast
     * (R3). The authority gate narrows to {@code ADMIN} the same way the inbox
     * does; the {@code super_admin} flag check then refuses a plain admin [H6].
     * The path id is the advert, the body only ever carries the target
     * universities and an optional note — nothing that could claim an origin, a
     * status or an offerer (L15: recipients are looked up server-side).
     */
    @PostMapping("/{id}/offers")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> offer(@PathVariable Long id,
            @RequestBody OpportunityOfferCreateRequest request, Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("An offer must come from a known session.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(opportunityService.offerToUniversities(actor, id, request));
    }

    /**
     * S5.2 (plan §6.3): {@code GET /offers} — a university's own offers, with
     * {@code universityId} forced from the session inside the service. The door
     * admits supervisors and admins; a student or company is refused before any
     * row exists, and an admin whose account has no university is refused by
     * the service rather than shown everyone's offers.
     */
    @GetMapping("/offers")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<OpportunityOffer>> myOffers(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("An offer list must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listOffers(actor));
    }

    /**
     * S5.2: {@code POST /{id}/offers/{offerId}/respond} — the university answers
     * an offer ({@code ACCEPTED} or {@code DECLINED}, plus an optional note).
     * Only the {@code SUPERVISOR} role passes this gate, so even a super admin
     * is refused (§6.3 — the university is the one answering, D2). The decision
     * is parsed here like S4.2 parses the target status: a missing or unknown
     * value is a 400 carrying the endpoint's own message, never a 500.
     */
    @PostMapping("/{id}/offers/{offerId}/respond")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<?> respond(@PathVariable Long id, @PathVariable Long offerId,
            @RequestBody Map<String, String> body, Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A response must come from a known session.");
        }
        String decision = body.get("decision");
        if (decision == null || decision.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A decision is required."));
        }
        OpportunityOffer.Status target;
        try {
            target = OpportunityOffer.Status.valueOf(decision.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown decision: " + decision));
        }
        if (target != OpportunityOffer.Status.ACCEPTED
                && target != OpportunityOffer.Status.DECLINED) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A decision must be ACCEPTED or DECLINED."));
        }
        String note = body.get("note");
        return ResponseEntity.ok(
                opportunityTransitionService.respondToOffer(actor, id, offerId, target, note));
    }

    /**
     * S6.2 (plan §6.3): {@code GET /submissions} — the R6 review queue for the
     * session's university. Same door as {@code /offers}: supervisors and admins
     * in, students and companies refused before any row exists, and the
     * university itself forced inside the service [H7].
     */
    @GetMapping("/submissions")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<OpportunitySubmission>> submissionQueue(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A submission queue must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listSubmissions(actor));
    }

    /**
     * S6.2: {@code POST /{id}/submissions/{submissionId}/respond} — the university
     * approves or rejects an R6 proposal (D2: its own pipeline, so {@code SUPERVISOR}
     * only and a super admin is refused too). The verb is parsed at the door like
     * the other two responders: missing, unknown or non-reviewable values are a
     * 400 with this endpoint's own message.
     */
    @PostMapping("/{id}/submissions/{submissionId}/respond")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<?> review(@PathVariable Long id, @PathVariable Long submissionId,
            @RequestBody Map<String, String> body, Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A review must come from a known session.");
        }
        String decision = body.get("decision");
        if (decision == null || decision.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A decision is required."));
        }
        OpportunitySubmission.Status target;
        try {
            target = OpportunitySubmission.Status
                    .valueOf(decision.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown decision: " + decision));
        }
        if (target != OpportunitySubmission.Status.APPROVED
                && target != OpportunitySubmission.Status.REJECTED) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A decision must be APPROVED or REJECTED."));
        }
        String note = body.get("note");
        return ResponseEntity.ok(opportunityTransitionService.transitionSubmission(
                actor, id, submissionId, target, note));
    }

    /**
     * S6.3 (plan §6.3): {@code POST /{id}/share} — the university puts an
     * advert in front of its own students (R4/R5/R6). The door is
     * {@code SUPERVISOR}-only (D2 — even a super admin is refused, like the
     * other relay answers), and everything past it is the engine's: scope 404
     * [H9], state 409, targeting 400 [H7][§5.8].
     */
    @PostMapping("/{id}/share")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<OpportunityShare> share(@PathVariable Long id,
            @RequestBody OpportunityShareCreateRequest request, Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A share must come from a known session.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(opportunityTransitionService.shareWithStudents(actor, id, request));
    }

    /**
     * S6.3: {@code GET /shared} — what my university has shared, newest first.
     * Same door and the same in-service tenancy as {@code /offers}: supervisors
     * and admins read, but the university is forced from the session [H7], so
     * the list is never a request parameter.
     */
    @GetMapping("/shared")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<OpportunityShare>> shared(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A share list must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listShares(actor));
    }

    /**
     * S6.4 (plan §6.4): {@code GET /api/opportunities} — the student feed (R7).
     * The mirror image of every other door on this controller: {@code STUDENT}
     * alone passes, so the relay personas can never read the audience view
     * either. What's inside is the service's four predicates — my university's
     * live share, a published advert, a deadline still ahead, targeting that
     * matches this student [H2][H4] — with the university forced from the
     * session [H7].
     */
    @GetMapping
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<List<OpportunityFeedItem>> feed(Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("A feed must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.listFeed(actor));
    }

    /**
     * S6.4 (plan §6.4): {@code GET /api/opportunities/{id}} — the same read by
     * id, 404 unless a live share addresses this student [H3]. The door is
     * {@code STUDENT}-only; past it the S2.3 resolver decides existence (a
     * guessed, unshared, closed or withdrawn advert is indistinguishable from
     * a missing one) and the service adds the targeting match, so a student
     * narrowed out of the share's audience cannot read it by id either [H2].
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<OpportunityFeedItem> feedItem(@PathVariable Long id, Principal principal) {
        UserEntity actor = principal == null ? null
                : userRepository.findByUsername(principal.getName()).orElse(null);
        if (actor == null) {
            throw new AccessDeniedException("An opportunity must come from a known session.");
        }
        return ResponseEntity.ok(opportunityService.feedItem(actor, id));
    }
}
