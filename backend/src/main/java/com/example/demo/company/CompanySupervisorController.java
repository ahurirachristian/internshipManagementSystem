package com.example.demo.company;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.auth.Role;

@RestController
@RequestMapping("/api/company-supervisors")
public class CompanySupervisorController {

    private final CompanySupervisorRepository supervisorRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanyDepartmentRepository departmentRepository;

    public CompanySupervisorController(CompanySupervisorRepository supervisorRepository,
                                       CompanyRepository companyRepository,
                                       UserRepository userRepository,
                                       CompanyDepartmentRepository departmentRepository) {
        this.supervisorRepository = supervisorRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<?> getSupervisors(@RequestParam(required = false) Long companyId, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long targetCompanyId = companyId;
        if (loggedInUser.getRole() == Role.COMPANY) {
            targetCompanyId = loggedInUser.getCompanyId();
            if (targetCompanyId == null) {
                return ResponseEntity.ok(List.of());
            }
        }

        if (targetCompanyId == null) {
            return ResponseEntity.ok(supervisorRepository.findAll().stream().map(this::toDto).collect(Collectors.toList()));
        }

        return ResponseEntity.ok(supervisorRepository.findByCompanyId(targetCompanyId).stream().map(this::toDto).collect(Collectors.toList()));
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> getCompanyDepartments(Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = loggedInUser.getCompanyId();
        if (companyId == null) {
            return ResponseEntity.ok(List.of());
        }
        List<Map<String, Object>> depts = departmentRepository.findByCompanyIdOrderByDepartmentNameAsc(companyId)
                .stream().map(d -> Map.<String, Object>of(
                        "id", d.getId(),
                        "departmentName", d.getDepartmentName()
                )).toList();
        return ResponseEntity.ok(depts);
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

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Company not found."));
        }

        CompanySupervisor supervisor = new CompanySupervisor();
        supervisor.setCompany(company);
        updateSupervisorFields(supervisor, payload);

        CompanySupervisor saved = supervisorRepository.save(supervisor);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> updateSupervisor(@PathVariable Long id, @RequestBody Map<String, Object> payload, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        CompanySupervisor supervisor = supervisorRepository.findById(id).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.notFound().build();
        }

        if (loggedInUser.getRole() == Role.COMPANY) {
            if (supervisor.getCompany() == null || !loggedInUser.getCompanyId().equals(supervisor.getCompany().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        updateSupervisorFields(supervisor, payload);
        CompanySupervisor saved = supervisorRepository.save(supervisor);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COMPANY')")
    public ResponseEntity<?> deleteSupervisor(@PathVariable Long id, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        if (loggedInUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        CompanySupervisor supervisor = supervisorRepository.findById(id).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.notFound().build();
        }

        if (loggedInUser.getRole() == Role.COMPANY) {
            if (supervisor.getCompany() == null || !loggedInUser.getCompanyId().equals(supervisor.getCompany().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        supervisorRepository.delete(supervisor);
        return ResponseEntity.noContent().build();
    }

    private void updateSupervisorFields(CompanySupervisor supervisor, Map<String, Object> payload) {
        if (payload.containsKey("fullName")) {
            supervisor.setFullName((String) payload.get("fullName"));
        }
        if (payload.containsKey("contact")) {
            supervisor.setContact((String) payload.get("contact"));
        }
        if (payload.containsKey("email")) {
            supervisor.setEmail((String) payload.get("email"));
        }
        if (payload.containsKey("role")) {
            supervisor.setRole((String) payload.get("role"));
        }
        if (payload.containsKey("isPrimary")) {
            supervisor.setIsPrimary((Boolean) payload.get("isPrimary"));
        }
        if (payload.containsKey("departmentId") && payload.get("departmentId") != null && !payload.get("departmentId").toString().isEmpty()) {
            try {
                Long deptId = Long.valueOf(payload.get("departmentId").toString());
                CompanyDepartment dept = departmentRepository.findById(deptId).orElse(null);
                supervisor.setDepartment(dept);
            } catch (Exception e) {
                supervisor.setDepartment(null);
            }
        } else if (payload.containsKey("departmentId")) {
            supervisor.setDepartment(null);
        }
    }

    private Map<String, Object> toDto(CompanySupervisor supervisor) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", supervisor.getId());
        dto.put("fullName", supervisor.getFullName());
        dto.put("contact", supervisor.getContact() != null ? supervisor.getContact() : "");
        dto.put("email", supervisor.getEmail() != null ? supervisor.getEmail() : "");
        dto.put("role", supervisor.getRole() != null ? supervisor.getRole() : "");
        dto.put("isPrimary", supervisor.getIsPrimary() != null ? supervisor.getIsPrimary() : false);
        if (supervisor.getCompany() != null) {
            dto.put("companyId", supervisor.getCompany().getId());
            dto.put("companyName", supervisor.getCompany().getName());
        }
        if (supervisor.getDepartment() != null) {
            dto.put("departmentId", supervisor.getDepartment().getId());
            dto.put("departmentName", supervisor.getDepartment().getDepartmentName());
        } else {
            dto.put("departmentId", null);
            dto.put("departmentName", "");
        }
        return dto;
    }
}
