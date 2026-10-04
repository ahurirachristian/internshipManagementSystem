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
}
