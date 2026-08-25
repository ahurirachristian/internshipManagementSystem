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
import com.example.demo.department.DepartmentRepository;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.school.SchoolRepository;

@RestController
@RequestMapping("/api/university/programmes")
@PreAuthorize("hasAuthority('SUPERVISOR')")
public class ProgrammeController {

    private final ProgrammeRepository programmeRepository;
    private final SchoolRepository schoolRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public ProgrammeController(ProgrammeRepository programmeRepository,
            SchoolRepository schoolRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            AuditLogService auditLogService) {
        this.programmeRepository = programmeRepository;
        this.schoolRepository = schoolRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<Programme> getProgrammes(@RequestParam(required = false) Integer schoolId,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer universityId, Principal principal) {
        Integer uid = requireOwnUniversity(principal);
        if (departmentId != null) {
            return programmeRepository.findByDepartmentId(departmentId);
        }
        if (schoolId != null) {
            return programmeRepository.findBySchoolId(schoolId);
        }
        if (universityId != null) {
            return programmeRepository.findByUniversityId(universityId);
        }
        return programmeRepository.findByUniversityId(uid);
    }

    @PostMapping
    public ResponseEntity<?> createProgramme(@RequestBody Programme request, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        try {
            Programme prog = new Programme();
            applyFields(prog, request, universityId);
            Programme saved = programmeRepository.save(prog);
            audit(principal, "CREATE", "Programme", "Created programme: " + saved.getProgrammeName());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProgramme(@PathVariable Integer id, @RequestBody Programme request,
            Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = programmeRepository.findById(id)
                .filter(p -> p.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            Programme prog = existing.get();
            applyFields(prog, request, universityId);
            Programme saved = programmeRepository.save(prog);
            audit(principal, "UPDATE", "Programme", "Updated programme: " + saved.getProgrammeName());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProgramme(@PathVariable Integer id, Principal principal) {
        Integer universityId = requireOwnUniversity(principal);
        var existing = programmeRepository.findById(id)
                .filter(p -> p.getUniversityId().equals(universityId));
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Programme prog = existing.get();
        programmeRepository.delete(prog);
        audit(principal, "DELETE", "Programme",
                "Deleted programme: " + prog.getProgrammeName() + " (ID: " + id + ")");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv(Principal principal) {
        String csv = programmeRepository.findByUniversityId(requireOwnUniversity(principal)).stream()
                .map(p -> String.join(",",
                        escape(p.getProgrammeId()),
                        escape(p.getSchoolId()),
                        escape(p.getDepartmentId()),
                        escape(p.getProgrammeCode()),
                        escape(p.getProgrammeName()),
                        escape(p.getProgrammeLevel()),
                        escape(p.getDurationYears())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ProgrammeID,SchoolID,DepartmentID,ProgrammeCode,ProgrammeName,ProgrammeLevel,DurationYears\n"
                + csv;
        return csvResponse(body, "programmes.csv");
    }

    private void applyFields(Programme prog, Programme request, Integer universityId) {
        if (request.getProgrammeId() == null) {
            throw new IllegalArgumentException("Programme ID is required.");
        }
        if (request.getProgrammeName() == null || request.getProgrammeName().isBlank()) {
            throw new IllegalArgumentException("Programme name is required.");
        }
        if (request.getProgrammeCode() == null || request.getProgrammeCode().isBlank()) {
            throw new IllegalArgumentException("Programme code is required.");
        }
        if (request.getProgrammeLevel() == null || request.getProgrammeLevel().isBlank()) {
            throw new IllegalArgumentException("Programme level is required.");
        }
        if (request.getDurationYears() == null || request.getDurationYears() <= 0) {
            throw new IllegalArgumentException("Duration in years must be a positive integer.");
        }
        if (request.getSchoolId() == null) {
            throw new IllegalArgumentException("School is required.");
        }
        schoolRepository.findById(request.getSchoolId())
                .filter(s -> s.getUniversityId().equals(universityId))
                .orElseThrow(() -> new IllegalArgumentException("School not found in your university."));
        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId())
                    .filter(d -> d.getUniversityId().equals(universityId))
                    .orElseThrow(() -> new IllegalArgumentException("Department not found in your university."));
        }
        prog.setProgrammeId(request.getProgrammeId());
        prog.setUniversityId(universityId);
        prog.setSchoolId(request.getSchoolId());
        prog.setDepartmentId(request.getDepartmentId());
        prog.setProgrammeCode(request.getProgrammeCode().trim());
        prog.setProgrammeName(request.getProgrammeName().trim());
        prog.setProgrammeLevel(request.getProgrammeLevel().trim());
        prog.setDurationYears(request.getDurationYears());
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
