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
@RequestMapping("/api/university/departments")
@PreAuthorize("hasAuthority('SUPERVISOR')")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final SchoolRepository schoolRepository;
    private final ProgrammeRepository programmeRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public DepartmentController(DepartmentRepository departmentRepository,
            SchoolRepository schoolRepository,
            ProgrammeRepository programmeRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.departmentRepository = departmentRepository;
        this.schoolRepository = schoolRepository;
        this.programmeRepository = programmeRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<Department> getDepartments(@RequestParam(required = false) Integer schoolId,
            @RequestParam(required = false) Integer universityId, Principal principal) {
        Integer uid = requireOwnUniversity(principal);
        if (schoolId != null) {
            return departmentRepository.findBySchoolId(schoolId);
        }
        if (universityId != null) {
            return departmentRepository.findByUniversityId(universityId);
        }
        return departmentRepository.findByUniversityId(uid);
    }

    @PostMapping
    public ResponseEntity<?> createDepartment(@RequestBody Department request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            Department dept = new Department();
            applyFields(dept, request, universityId);
            Department saved = departmentRepository.save(dept);
            audit(principal, "CREATE", "Department", "Created department: " + saved.getDepartmentName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDepartment(@PathVariable Integer id, @RequestBody Department request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = departmentRepository.findById(id)
                .filter(d -> d.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            Department dept = existing.get();
            applyFields(dept, request, universityId);
            Department saved = departmentRepository.save(dept);
            audit(principal, "UPDATE", "Department", "Updated department: " + saved.getDepartmentName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDepartment(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = departmentRepository.findById(id)
                .filter(d -> d.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Department dept = existing.get();

        programmeRepository.findByDepartmentId(id).forEach(prog -> prog.setDepartmentId(null));

        departmentRepository.delete(dept);
        audit(principal, "DELETE", "Department",
                "Deleted department: " + dept.getDepartmentName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv(Principal principal) {
        String csv = departmentRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(d -> String.join(",",
                        escape(d.getDepartmentId()),
                        escape(d.getSchoolId()),
                        escape(d.getDepartmentName())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "DepartmentID,SchoolID,DepartmentName\n" + csv;
        return csvResponse(body, "departments.csv");
    }

    private void applyFields(Department dept, Department request, Integer universityId) {
        if (request.getDepartmentId() == null) {
            throw new IllegalArgumentException("Department ID is required.");
        }
        if (request.getDepartmentName() == null || request.getDepartmentName().isBlank()) {
            throw new IllegalArgumentException("Department name is required.");
        }
        if (request.getSchoolId() == null) {
            throw new IllegalArgumentException("School is required.");
        }
        schoolRepository.findById(request.getSchoolId())
                .filter(s -> s.getUniversityId().equals(universityId))
                .orElseThrow(() -> new IllegalArgumentException("School not found in your university."));
        dept.setDepartmentId(request.getDepartmentId());
        dept.setUniversityId(universityId);
        dept.setSchoolId(request.getSchoolId());
        dept.setDepartmentName(request.getDepartmentName().trim());
    }

    private Integer requireOwnUniversity(Principal principal) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElseThrow(
                () -> new IllegalArgumentException("Authenticated user not found."));
        if (user.getUniversityId() == null) {
            throw new IllegalArgumentException("Your account is not linked to a university.");
        }
        return user.getUniversityId().intValue();
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
