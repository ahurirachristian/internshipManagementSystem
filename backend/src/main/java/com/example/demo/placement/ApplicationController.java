package com.example.demo.placement;

import java.security.Principal;
import java.util.List;
import java.util.Map;

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
 * PC9 (D3, part 2): vacancy applications.
 *
 * <p>Endpoints:
 * <ul>
 *   <li>{@code POST /api/applications} — a student applies to a vacancy.</li>
 *   <li>{@code GET /api/applications} — the applicant list, scoped by the
 *       caller (admin → all, company → own, student → own).</li>
 *   <li>{@code GET /api/applications/funnel} — zero-filled funnel counts for
 *       the same scope (PC12's company chart reads this).</li>
 *   <li>{@code POST /api/applications/{id}/transition} — one lifecycle move;
 *       scope first (404 outside it), then the closed transition map (409).</li>
 * </ul>
 *
 * <p>Deliberate exclusions (PC9): SUPERVISOR and INDUSTRIAL_SUPERVISOR are
 * not in the class-level authorities — applicant PII is a company/admin
 * concern, and a university supervisor has no seat at this table.
 */
@RestController
@RequestMapping("/api/applications")
@PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY', 'STUDENT')")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final UserRepository userRepository;

    public ApplicationController(ApplicationService applicationService, UserRepository userRepository) {
        this.applicationService = applicationService;
        this.userRepository = userRepository;
    }

    /** PC9: a student applies — body carries the vacancy id and an optional note. */
    @PostMapping
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<?> apply(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity actor = requireActor(principal);
        Object vacancyId = body.get("vacancyId");
        if (vacancyId == null || vacancyId.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A vacancy is required."));
        }
        long id;
        try {
            id = Long.parseLong(vacancyId.toString().trim());
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown vacancy: " + vacancyId));
        }
        String note = body.get("note") == null ? null : body.get("note").toString();
        ApplicationDto created = applicationService.apply(actor, id, note);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Scoped applicant list — the same scope as the funnel. */
    @GetMapping
    public List<ApplicationDto> list(Principal principal) {
        return applicationService.listFor(requireActor(principal));
    }

    /**
     * PC9: funnel counts for the caller's scope. The literal path wins over
     * /{id} in Spring's pattern ranking (same as /api/placements/timeline).
     */
    @GetMapping("/funnel")
    public ApplicationFunnelDto funnel(Principal principal) {
        return applicationService.funnelFor(requireActor(principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationDto> detail(@PathVariable Long id, Principal principal) {
        UserEntity actor = requireActor(principal);
        // Scoped lookup: an id outside the caller's scope is simply absent.
        return applicationService.listFor(actor).stream()
                .filter(row -> row.id().equals(id))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PC9: one lifecycle transition. Scope is enforced inside the service
     * (404 for a row outside it — L7, no probing oracle); the closed map
     * rejects illegal jumps with 409 — both via GlobalExceptionHandler.
     */
    @PostMapping("/{id}/transition")
    public ResponseEntity<?> transition(@PathVariable Long id, @RequestBody Map<String, String> body,
            Principal principal) {
        UserEntity actor = requireActor(principal);
        String target = body.get("status");
        if (target == null || target.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A target status is required."));
        }
        Application.Status status;
        try {
            status = Application.Status.valueOf(target.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown status: " + target));
        }
        // Scope (404) and the closed transition map (409) are enforced in the
        // service and mapped by GlobalExceptionHandler.
        return ResponseEntity.ok(applicationService.transition(actor, id, status));
    }

    private UserEntity requireActor(Principal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new AccessDeniedException("Authentication required."));
    }
}
