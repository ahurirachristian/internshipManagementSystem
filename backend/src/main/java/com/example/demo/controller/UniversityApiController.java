package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.UserRepository;
import com.example.demo.service.UniversityDashboardService;

@RestController
@RequestMapping("/api/university")
public class UniversityApiController {

    private final UniversityDashboardService universityDashboardService;
    private final UserRepository userRepository;

    public UniversityApiController(UniversityDashboardService universityDashboardService, UserRepository userRepository) {
        this.universityDashboardService = universityDashboardService;
        this.userRepository = userRepository;
    }

    /**
     * M8: university-scoped overview for the dashboard. Aggregates students,
     * companies, diaries, evaluations and placements for the calling
     * supervisor's own university (resolved from the logged-in user).
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> stats(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        Long universityId = userRepository.findByUsername(principal.getName())
                .map(u -> u.getUniversityId())
                .orElse(null);
        if (universityId == null) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Your account is not linked to a university."));
        }
        return ResponseEntity.ok(universityDashboardService.stats(universityId));
    }
}
