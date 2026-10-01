package com.example.demo.placement;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.RateLimiter;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

import java.security.Principal;
import java.time.Duration;

/**
 * P7 (R8/L9): POST /api/companies/student-lookup — COMPANY / ADMIN /
 * SUPERVISOR-own-university. 30 lookups per minute per caller (L9).
 */
@RestController
@RequestMapping("/api/companies")
public class StudentLookupController {

    private static final int LOOKUPS_PER_MINUTE = 30;
    private static final Duration LOOKUP_WINDOW = Duration.ofMinutes(1);

    private final StudentLookupService lookupService;
    private final UserRepository userRepository;
    private final RateLimiter rateLimiter;
    private final AuthorizationScopeService scopeService;

    public StudentLookupController(StudentLookupService lookupService, UserRepository userRepository,
            RateLimiter rateLimiter, AuthorizationScopeService scopeService) {
        this.lookupService = lookupService;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
        this.scopeService = scopeService;
    }

    @PostMapping("/student-lookup")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'ADMIN', 'SUPERVISOR', 'INDUSTRIAL_SUPERVISOR')")
    public ResponseEntity<?> studentLookup(@RequestBody Map<String, Object> body, Principal principal,
            HttpServletRequest request) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        if (!rateLimiter.tryAcquire("student-lookup:" + actor.getId(), LOOKUPS_PER_MINUTE, LOOKUP_WINDOW)) {
            return ResponseEntity.status(429).body(Map.of("error", "Too many lookups. Try again shortly."));
        }
        Long universityId = longValue(body.get("universityId"));
        String studentNumber = body.get("studentNumber") == null ? null : body.get("studentNumber").toString();
        // L9/PC7: a university supervisor may only look inside their own
        // university. A company-scoped field supervisor has no university and
        // names one explicitly, exactly like a COMPANY caller — coercing their
        // null universityId here would have made every lookup a 400.
        if ("SUPERVISOR".equals(actor.getRole().name())
                && universityId != null
                && !scopeService.isAdminLike(actor)
                && !universityId.equals(actor.getUniversityId())) {
            universityId = actor.getUniversityId();
        }
        String ip = request.getRemoteAddr();
        try {
            StudentLookupDto dto = lookupService.lookup(actor, universityId, studentNumber, ip);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (java.util.NoSuchElementException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Student not found."));
        }
    }

    private Long longValue(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
