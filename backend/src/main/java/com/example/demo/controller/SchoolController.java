package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.School;
import com.example.demo.school.SchoolRepository;

@RestController
@RequestMapping("/api/university/schools")
@PreAuthorize("hasAuthority('SUPERVISOR')")
public class SchoolController {

    private static final List<String> VALID_TYPES = List.of("COLLEGE", "SCHOOL", "DIRECTORATE");

    private final SchoolRepository schoolRepository;
    private final DepartmentRepository departmentRepository;
    private final ProgrammeRepository programmeRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public SchoolController(SchoolRepository schoolRepository,
            DepartmentRepository departmentRepository,
            ProgrammeRepository programmeRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.schoolRepository = schoolRepository;
        this.departmentRepository = departmentRepository;
        this.programmeRepository = programmeRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<School> getSchools(@RequestParam(required = false) Integer universityId, Principal principal) {
        Integer uid = requireOwnUniversity(principal);
        if (universityId != null) {
            return schoolRepository.findByUniversityId(universityId);
        }
        return schoolRepository.findByUniversityId(uid);
    }

    @PostMapping
    public ResponseEntity<?> createSchool(@RequestBody School request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            School school = new School();
            applyFields(school, request, universityId);
            School saved = schoolRepository.save(school);
            audit(principal, "CREATE", "School", "Created school: " + saved.getSchoolName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchool(@PathVariable Integer id, @RequestBody School request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = schoolRepository.findById(id)
                .filter(s -> s.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            School school = existing.get();
            applyFields(school, request, universityId);
            School saved = schoolRepository.save(school);
            audit(principal, "UPDATE", "School", "Updated school: " + saved.getSchoolName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchool(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = schoolRepository.findById(id)
                .filter(s -> s.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        School school = existing.get();

        schoolRepository.findByParentSchoolId(id).forEach(child -> child.setParentSchoolId(null));
        departmentRepository.findBySchoolId(id).forEach(dept -> dept.setSchoolId(null));
        programmeRepository.findBySchoolId(id).forEach(prog -> prog.setSchoolId(null));

        schoolRepository.delete(school);
        audit(principal, "DELETE", "School",
                "Deleted school: " + school.getSchoolName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv(Principal principal) {
        String csv = schoolRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(s -> String.join(",",
                        escape(s.getSchoolId()),
                        escape(s.getSchoolCode()),
                        escape(s.getSchoolName()),
                        escape(s.getParentSchoolId()),
                        escape(s.getType())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "SchoolID,SchoolCode,SchoolName,ParentSchoolID,Type\n" + csv;
        return csvResponse(body, "schools.csv");
    }

    private void applyFields(School school, School request, Integer universityId) {
        if (request.getSchoolId() == null) {
            throw new IllegalArgumentException("School ID is required.");
        }
        if (request.getSchoolName() == null || request.getSchoolName().isBlank()) {
            throw new IllegalArgumentException("School name is required.");
        }
        if (request.getType() != null && !request.getType().isBlank()
                && !VALID_TYPES.contains(request.getType().toUpperCase())) {
            throw new IllegalArgumentException("Type must be one of: " + String.join(", ", VALID_TYPES));
        }
        if (request.getParentSchoolId() != null) {
            if (request.getParentSchoolId().equals(request.getSchoolId())) {
                throw new IllegalArgumentException("A school cannot be its own parent.");
            }
            School parent = schoolRepository.findById(request.getParentSchoolId())
                    .filter(p -> p.getUniversityId().equals(universityId))
                    .orElseThrow(() -> new IllegalArgumentException("Parent school not found in your university."));
            if (!"SCHOOL".equalsIgnoreCase(parent.getType()) && !"COLLEGE".equalsIgnoreCase(parent.getType())) {
                throw new IllegalArgumentException("Parent must be a SCHOOL or COLLEGE.");
            }
        }
        school.setSchoolId(request.getSchoolId());
        school.setUniversityId(universityId);
        school.setSchoolName(request.getSchoolName().trim());
        school.setSchoolCode(trimToNull(request.getSchoolCode()));
        school.setParentSchoolId(request.getParentSchoolId());
        school.setType(request.getType() != null ? request.getType().toUpperCase() : null);
    }

    private Integer requireOwnUniversity(Principal principal) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElseThrow(
                () -> new IllegalArgumentException("Authenticated user not found."));
        if (user.getUniversityId() == null) {
            throw new IllegalArgumentException("Your account is not linked to a university.");
        }
        return user.getUniversityId().intValue();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void audit(Principal principal, String action, String targetEntity, String details) {
        auditLogService.log(principal != null ? principal.getName() : "system", "SUPERVISOR", action,
                targetEntity, details, null);
    }

    private ResponseEntity<String> csvResponse(String body, String fileName) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(body);
    }

    private String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }
}
