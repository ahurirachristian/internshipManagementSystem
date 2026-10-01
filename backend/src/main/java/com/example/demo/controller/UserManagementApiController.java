package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.ManagedResetService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.auth.UserRoleService;
import com.example.demo.company.CompanyPeopleService;
import com.example.demo.university.UniversityPeopleService;

/**
 * P2: managed account reset. ADMIN scope only for now — P5 adds university
 * scope and P6 company scope (L21).
 */
@RestController
@RequestMapping("/api/users")
public class UserManagementApiController {

    private final ManagedResetService managedResetService;
    private final UserRepository userRepository;
    private final UserRoleService userRoleService;
    private final AuthorizationScopeService scopeService;
    private final UniversityPeopleService universityPeopleService;
    private final CompanyPeopleService companyPeopleService;

    public UserManagementApiController(ManagedResetService managedResetService,
            UserRepository userRepository, UserRoleService userRoleService,
            AuthorizationScopeService scopeService, UniversityPeopleService universityPeopleService,
            CompanyPeopleService companyPeopleService) {
        this.managedResetService = managedResetService;
        this.userRepository = userRepository;
        this.userRoleService = userRoleService;
        this.scopeService = scopeService;
        this.universityPeopleService = universityPeopleService;
        this.companyPeopleService = companyPeopleService;
    }

    /** P2/L21: ADMIN anywhere; P5 university supervisors within their own university; P6/PC7 companies for their own field supervisors. */
    @PostMapping("/{id}/reset")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'INDUSTRIAL_SUPERVISOR', 'COMPANY')")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        if (scopeService.isAdminLike(actor)) {
            // Admin anywhere.
        } else if ("COMPANY".equals(actor.getRole().name())) {
            // Own field supervisors only, never ADMIN/super-admin targets (L7).
            companyPeopleService.requireOwnSupervisor(actor, id);
        } else {
            // 404 across tenants, 403 for privileged targets, per L7.
            universityPeopleService.requireTarget(actor, id);
        }
        String tempPassword = managedResetService.resetPassword(id, actor);
        // D11: shown once, never stored or emailed.
        return ResponseEntity.ok(Map.of("tempPassword", tempPassword));
    }

    /** P4 (R6/L6): only a super admin may grant/revoke roles. */
    @PostMapping("/{id}/role")
    @PreAuthorize("hasAuthority('super_admin')")
    public ResponseEntity<?> grantRole(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        UserEntity target = userRoleService.grantRole(actor, id, string(body.get("role")),
                longValue(body.get("universityId")), string(body.get("companyName")));
        return ResponseEntity.ok(Map.of(
                "id", target.getId(),
                "username", target.getUsername(),
                "role", target.getRole().name()));
    }

    /** P4 (R6/L5): disabling applies on the target's very next request. */
    @PostMapping("/{id}/enabled")
    @PreAuthorize("hasAuthority('super_admin')")
    public ResponseEntity<?> setEnabled(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        boolean enabled = !Boolean.FALSE.equals(body.get("enabled"));
        UserEntity target = userRoleService.setEnabled(actor, id, enabled);
        return ResponseEntity.ok(Map.of(
                "id", target.getId(),
                "username", target.getUsername(),
                "enabled", Boolean.TRUE.equals(target.getEnabled())));
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
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
