package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisorRepository;

/**
 * M5: no longer serializes UserEntity rows — the raw entities leaked the
 * bcrypt password hash (ONBOARDING.md §9). Returns a safe projection.
 */
@RestController
@RequestMapping("/api/supervisors")
public class SupervisorController {

    private final UserRepository userRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;

    public SupervisorController(UserRepository userRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository) {
        this.userRepository = userRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getSupervisors(@RequestParam(required = false) String type) {
        List<UserEntity> supervisors = userRepository.findByRole(Role.SUPERVISOR);
        if (type != null && !type.isBlank()) {
            String upperType = type.trim().toUpperCase();
            supervisors = supervisors.stream()
                    .filter(user -> {
                        if ("UNIVERSITY".equals(upperType)) {
                            return user.getUniversityId() != null;
                        }
                        if ("COMPANY".equals(upperType)) {
                            return user.getCompanyId() != null;
                        }
                        return true;
                    })
                    .toList();
        }
        return supervisors.stream().map(this::toView).toList();
    }

    /** M5: Model-B supervisor rows for placement assignment selects. */
    @GetMapping("/university")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<Map<String, Object>> getUniversitySupervisors() {
        return universitySupervisorRepository.findAll().stream()
                .map(sup -> Map.<String, Object>of(
                        "id", sup.getId(),
                        "name", (sup.getFirstName() + " " + sup.getLastName()).trim(),
                        "department", sup.getDepartment() != null ? sup.getDepartment() : "",
                        "universityId", sup.getUniversityId() != null ? sup.getUniversityId() : 0))
                .toList();
    }

    /** M5: Model-B industrial supervisor rows for placement assignment selects. */
    @GetMapping("/industrial")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<Map<String, Object>> getIndustrialSupervisors(
            @RequestParam(required = false) Long companyId,
            java.security.Principal principal) {
        UserEntity loggedInUser = principal != null
                ? userRepository.findByUsername(principal.getName()).orElse(null)
                : null;
        Long targetCompanyId = companyId;
        if (loggedInUser != null && loggedInUser.getRole() == Role.COMPANY) {
            targetCompanyId = loggedInUser.getCompanyId();
        }
        final Long filter = targetCompanyId;
        return industrialSupervisorRepository.findAll().stream()
                .filter(sup -> filter == null || filter.equals(sup.getCompanyId()))
                .map(sup -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", sup.getId());
                    m.put("companyId", sup.getCompanyId() != null ? sup.getCompanyId() : 0);
                    m.put("firstName", sup.getFirstName() != null ? sup.getFirstName() : "");
                    m.put("lastName", sup.getLastName() != null ? sup.getLastName() : "");
                    m.put("fullName", (sup.getFirstName() != null ? sup.getFirstName() : " ")
                            + " " + (sup.getLastName() != null ? sup.getLastName() : ""));
                    m.put("jobTitle", sup.getJobTitle() != null ? sup.getJobTitle() : "");
                    m.put("department", sup.getDepartment() != null ? sup.getDepartment() : "");
                    m.put("phoneNumber", sup.getPhoneNumber() != null ? sup.getPhoneNumber() : "");
                    return m;
                })
                .toList();
    }

    private Map<String, Object> toView(UserEntity user) {
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "universityId", user.getUniversityId() != null ? user.getUniversityId() : 0,
                "companyId", user.getCompanyId() != null ? user.getCompanyId() : 0);
    }
}
