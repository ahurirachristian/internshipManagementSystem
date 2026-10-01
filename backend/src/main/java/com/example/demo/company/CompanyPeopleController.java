package com.example.demo.company;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.UserDto;

/**
 * P6 (R7, plan §6.6): a company manages its own field supervisors.
 */
@RestController
@RequestMapping("/api/companies/me")
@PreAuthorize("hasAuthority('COMPANY')")
public class CompanyPeopleController {

    private final CompanyPeopleService peopleService;
    private final CompanyAnalyticsService analyticsService;
    private final UserRepository userRepository;

    public CompanyPeopleController(CompanyPeopleService peopleService,
            CompanyAnalyticsService analyticsService,
            UserRepository userRepository) {
        this.peopleService = peopleService;
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    /**
     * PC4: the Overview tab's single read. Scoped to the authenticated company,
     * so there is no company id on the request to tamper with.
     */
    @GetMapping("/analytics")
    public Map<String, Object> analytics(Principal principal) {
        return analyticsService.analytics(current(principal));
    }

    @GetMapping("/supervisors")
    public List<UserDto> list(Principal principal) {
        return peopleService.list(current(principal));
    }

    /** PC4: the modal's edit path. Scoped to the caller's own company by the service. */
    @PatchMapping("/supervisors/{id}")
    public UserDto update(@PathVariable Long id, @RequestBody Map<String, Object> body, Principal principal) {
        UserEntity updated = peopleService.updateFieldSupervisor(current(principal), id,
                string(body.get("email")), string(body.get("phone")), string(body.get("department")));
        UserDto dto = new UserDto(updated.getId(), updated.getUsername(), updated.getRole().name(),
                updated.getEmail(), updated.getCompanyId(), updated.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(updated.getEnabled()));
        dto.setMustChangePassword(Boolean.TRUE.equals(updated.getMustChangePassword()));
        return dto;
    }

    @PostMapping("/supervisors")
    public ResponseEntity<UserDto> create(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity created = peopleService.createFieldSupervisor(current(principal),
                string(body.get("firstName")), string(body.get("lastName")),
                string(body.get("email")), string(body.get("phone")), string(body.get("department")));
        UserDto dto = new UserDto(created.getId(), created.getUsername(), created.getRole().name(),
                created.getEmail(), created.getCompanyId(), created.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(created.getEnabled()));
        dto.setMustChangePassword(Boolean.TRUE.equals(created.getMustChangePassword()));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    private UserEntity current(Principal principal) {
        return userRepository.findByUsername(principal.getName()).orElseThrow();
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
    }
}
