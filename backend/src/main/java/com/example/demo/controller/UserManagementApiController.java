package com.example.demo.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.ManagedResetService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/**
 * P2: managed account reset. ADMIN scope only for now — P5 adds university
 * scope and P6 company scope (L21).
 */
@RestController
@RequestMapping("/api/users")
public class UserManagementApiController {

    private final ManagedResetService managedResetService;
    private final UserRepository userRepository;

    public UserManagementApiController(ManagedResetService managedResetService,
            UserRepository userRepository) {
        this.managedResetService = managedResetService;
        this.userRepository = userRepository;
    }

    @PostMapping("/{id}/reset")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, Principal principal) {
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        String tempPassword = managedResetService.resetPassword(id, actor);
        // D11: shown once, never stored or emailed.
        return ResponseEntity.ok(Map.of("tempPassword", tempPassword));
    }
}
