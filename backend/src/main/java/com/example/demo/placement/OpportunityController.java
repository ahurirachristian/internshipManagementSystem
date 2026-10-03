package com.example.demo.placement;

import java.security.Principal;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * S3.1 (opportunity plan §6.1): the opportunity surface. One endpoint so far —
 * {@code POST /api/opportunities}, gated to the three personas the brief lets
 * put an advert into the system ({@code COMPANY}, {@code SUPERVISOR},
 * {@code ADMIN}); students and field supervisors are refused at the door with a
 * 403 before any tenancy question is asked.
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
    private final UserRepository userRepository;

    public OpportunityController(OpportunityService opportunityService, UserRepository userRepository) {
        this.opportunityService = opportunityService;
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
}
