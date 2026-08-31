package com.example.demo.supervisor;

import java.security.Principal;
import java.util.Map;
import java.util.HashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.auth.Role;

/**
 * Company-managed field (industrial) supervisors. Each row is tied to a
 * company and to a login account (Role.SUPERVISOR + companyId) so the field
 * supervisor can sign in and submit evaluations. This is the supervisor model
 * the company dashboard manages on its Staff tab.
 */
@RestController
@RequestMapping("/api/supervisors/industrial")
public class IndustrialSupervisorController {

    private final IndustrialSupervisorRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public IndustrialSupervisorController(IndustrialSupervisorRepository repository,
                                          UserRepository userRepository,
                                          PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> createSupervisor(@RequestBody Map<String, Object> payload, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long companyId = null;
        if (loggedInUser.getRole() == Role.COMPANY) {
            companyId = loggedInUser.getCompanyId();
        } else if (payload.get("companyId") != null) {
            companyId = Long.valueOf(payload.get("companyId").toString());
        }
        if (companyId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Company ID is required."));
        }

        String firstName = (String) payload.getOrDefault("firstName", "");
        String lastName = (String) payload.getOrDefault("lastName", "");
        if (firstName.isBlank() && lastName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Supervisor name is required."));
        }

        String email = (String) payload.getOrDefault("email", "");
        String username = (String) payload.getOrDefault("username", "");
        if (username.isBlank()) {
            username = firstName.isBlank() ? lastName : firstName;
            username = username.toLowerCase().replaceAll("[^a-z0-9]", "") + (companyId % 1000);
        }
        UserEntity existingByUser = userRepository.findByUsername(username).orElse(null);
        if (existingByUser != null && existingByUser.getRole() != Role.SUPERVISOR) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "That username is already in use by another account."));
        }
        UserEntity linkedUser = existingByUser;
        if (linkedUser == null && email != null && !email.isBlank()) {
            linkedUser = userRepository.findByEmail(email).orElse(null);
        }
        if (linkedUser == null) {
            linkedUser = new UserEntity(
                    username,
                    passwordEncoder.encode(firstName.isBlank() ? lastName : firstName),
                    Role.SUPERVISOR,
                    companyId,
                    null);
            linkedUser.setEmail(email.isBlank() ? null : email);
            linkedUser = userRepository.save(linkedUser);
        }

        IndustrialSupervisor supervisor = new IndustrialSupervisor();
        supervisor.setCompanyId(companyId);
        supervisor.setUserId(linkedUser.getId());
        supervisor.setFirstName(firstName);
        supervisor.setLastName(lastName);
        supervisor.setJobTitle((String) payload.getOrDefault("role", (String) payload.getOrDefault("jobTitle", "")));
        supervisor.setDepartment((String) payload.getOrDefault("department", ""));
        supervisor.setPhoneNumber((String) payload.getOrDefault("phoneNumber", (String) payload.getOrDefault("contact", "")));
        IndustrialSupervisor saved = repository.save(supervisor);

        Map<String, Object> dto = toDto(saved);
        dto.put("loginUsername", username);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> updateSupervisor(@PathVariable Long id, @RequestBody Map<String, Object> payload, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        IndustrialSupervisor supervisor = repository.findById(id).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.notFound().build();
        }
        if (loggedInUser.getRole() == Role.COMPANY
                && !loggedInUser.getCompanyId().equals(supervisor.getCompanyId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (payload.containsKey("firstName")) {
            supervisor.setFirstName((String) payload.get("firstName"));
        }
        if (payload.containsKey("lastName")) {
            supervisor.setLastName((String) payload.get("lastName"));
        }
        if (payload.containsKey("role") || payload.containsKey("jobTitle")) {
            Object role = payload.containsKey("role") ? payload.get("role") : payload.get("jobTitle");
            supervisor.setJobTitle(role != null ? role.toString() : null);
        }
        if (payload.containsKey("department")) {
            supervisor.setDepartment((String) payload.get("department"));
        }
        if (payload.containsKey("phoneNumber")) {
            supervisor.setPhoneNumber((String) payload.get("phoneNumber"));
        }
        IndustrialSupervisor saved = repository.save(supervisor);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> deleteSupervisor(@PathVariable Long id, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        IndustrialSupervisor supervisor = repository.findById(id).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.notFound().build();
        }
        if (loggedInUser.getRole() == Role.COMPANY
                && !loggedInUser.getCompanyId().equals(supervisor.getCompanyId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        repository.delete(supervisor);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toDto(IndustrialSupervisor supervisor) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", supervisor.getId());
        dto.put("companyId", supervisor.getCompanyId());
        dto.put("userId", supervisor.getUserId());
        String fn = supervisor.getFirstName() == null ? "" : supervisor.getFirstName();
        String ln = supervisor.getLastName() == null ? "" : supervisor.getLastName();
        dto.put("firstName", fn);
        dto.put("lastName", ln);
        dto.put("fullName", (fn + " " + ln).trim());
        dto.put("role", supervisor.getJobTitle() != null ? supervisor.getJobTitle() : "");
        dto.put("department", supervisor.getDepartment() != null ? supervisor.getDepartment() : "");
        dto.put("contact", supervisor.getPhoneNumber() != null ? supervisor.getPhoneNumber() : "");
        userRepository.findById(supervisor.getUserId()).ifPresent(u -> {
            dto.put("email", u.getEmail() != null ? u.getEmail() : "");
            dto.put("username", u.getUsername());
        });
        return dto;
    }
}
