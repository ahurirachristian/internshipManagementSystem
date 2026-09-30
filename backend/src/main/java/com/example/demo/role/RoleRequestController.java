package com.example.demo.role;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

/** P3 endpoint surface (plan §6.4). */
@RestController
@RequestMapping("/api/role-requests")
public class RoleRequestController {

    private final RoleRequestService roleRequestService;
    private final UserRepository userRepository;

    public RoleRequestController(RoleRequestService roleRequestService, UserRepository userRepository) {
        this.roleRequestService = roleRequestService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity requester = current(principal);
        RoleRequest request = roleRequestService.create(requester,
                string(body.get("requestedRole")),
                longValue(body.get("universityId")),
                string(body.get("companyName")),
                string(body.get("comment")));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto(request));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public List<Map<String, Object>> mine(Principal principal) {
        return roleRequestService.mine(current(principal).getId()).stream().map(this::dto).toList();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('super_admin')")
    public List<Map<String, Object>> list(@RequestParam(required = false) String status) {
        return roleRequestService.list(status).stream().map(this::dto).toList();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('super_admin')")
    public Map<String, Object> approve(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body,
            Principal principal) {
        Map<String, Object> payload = body == null ? Map.of() : body;
        RoleRequest request = roleRequestService.approve(id, current(principal),
                longValue(payload.get("universityId")), string(payload.get("companyName")));
        return dto(request);
    }

    @PostMapping("/{id}/deny")
    @PreAuthorize("hasAuthority('super_admin')")
    public Map<String, Object> deny(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body,
            Principal principal) {
        Map<String, Object> payload = body == null ? Map.of() : body;
        RoleRequest request = roleRequestService.deny(id, current(principal), string(payload.get("comment")));
        return dto(request);
    }

    private UserEntity current(Principal principal) {
        return userRepository.findByUsername(principal.getName()).orElseThrow();
    }

    private Map<String, Object> dto(RoleRequest r) {
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("userId", r.getUserId());
        map.put("requestedRole", r.getRequestedRole());
        map.put("contextUniversityId", r.getContextUniversityId());
        map.put("contextCompanyName", r.getContextCompanyName());
        map.put("status", r.getStatus());
        map.put("reviewComment", r.getReviewComment());
        map.put("requestedAt", r.getRequestedAt() == null ? null : r.getRequestedAt().toString());
        return map;
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
