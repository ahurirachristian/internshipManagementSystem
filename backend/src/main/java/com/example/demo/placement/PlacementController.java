package com.example.demo.placement;

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
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import java.security.Principal;
import com.example.demo.student.Student;

@RestController
@RequestMapping("/api/placements")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'INDUSTRIAL_SUPERVISOR', 'COMPANY')")
public class PlacementController {

    private final PlacementService placementService;
    private final PlacementPipelineService pipelineService;
    private final AuditLogService auditLogService;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;

    public PlacementController(PlacementService placementService, PlacementPipelineService pipelineService,
            AuditLogService auditLogService,
            UniversitySupervisorRepository universitySupervisorRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            UserRepository userRepository,
            StudentRepository studentRepository) {
        this.placementService = placementService;
        this.pipelineService = pipelineService;
        this.auditLogService = auditLogService;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
    }

    /**
     * M5 bridge: derive typed supervisor ids from the legacy display strings
     * when the client did not send them.
     */
    private void resolveSupervisorIds(Placement placement) {
        if (placement.getUniversitySupervisorId() == null && placement.getUniversitySupervisor() != null) {
            String needle = placement.getUniversitySupervisor().trim().toLowerCase();
            universitySupervisorRepository.findAll().stream()
                    .filter(sup -> {
                        String name = (sup.getFirstName() + " " + sup.getLastName()).trim().toLowerCase();
                        return name.equals(needle) || name.contains(needle) || needle.contains(name);
                    })
                    .findFirst()
                    .ifPresent(sup -> placement.setUniversitySupervisorId(sup.getId()));
        }
        if (placement.getCompanySupervisorId() == null && placement.getCompanySupervisor() != null) {
            String needle = placement.getCompanySupervisor().trim().toLowerCase();
            industrialSupervisorRepository.findAll().stream()
                    .filter(sup -> {
                        String name = (sup.getFirstName() + " " + sup.getLastName()).trim().toLowerCase();
                        return name.equals(needle) || name.contains(needle) || needle.contains(name);
                    })
                    .findFirst()
                    .ifPresent(sup -> placement.setCompanySupervisorId(sup.getId()));
        }
    }

    @GetMapping
    public List<Placement> getPlacements() {
        return placementService.findAll();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<Placement> getMyPlacement(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        return placementService.findByStudentId(student.getId()).stream()
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private Student currentStudent(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .orElse(null);
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportPlacementsCsv() {
        List<Placement> placements = placementService.findAll();
        String csv = placements.stream()
                .map(p -> String.join(",",
                        escape(p.getId()),
                        escape(p.getStudentId()),
                        escape(p.getCompanyId()),
                        escape(p.getUniversitySupervisor()),
                        escape(p.getCompanySupervisor()),
                        escape(p.getStatus() != null ? p.getStatus().name() : "")))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,StudentId,CompanyId,UniversitySupervisor,CompanySupervisor,Status\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"placements.csv\"")
                .body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Placement> getPlacement(@PathVariable Long id) {
        Placement placement = placementService.findById(id);
        if (placement == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(placement);
    }

    /**
     * P7: a COMPANY caller posts an offer ({studentId, offerNote}) — status
     * OFFERED with the companyId forced from the session (L8). ADMIN keeps
     * the legacy direct-creation path.
     */
    @PostMapping
    public ResponseEntity<?> createPlacement(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity actor = currentUser(principal);
        if (actor != null && "COMPANY".equals(actor.getRole().name())) {
            Long studentId = longValue(body.get("studentId"));
            if (studentId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "A student is required."));
            }
            Placement saved = pipelineService.createOffer(actor, studentId,
                    body.get("offerNote") == null ? null : body.get("offerNote").toString());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        }

        Placement placement = new Placement();
        placement.setStudentId(longValue(body.get("studentId")));
        placement.setCompanyId(longValue(body.get("companyId")));
        placement.setUniversitySupervisor(string(body.get("universitySupervisor")));
        placement.setCompanySupervisor(string(body.get("companySupervisor")));
        placement.setUniversitySupervisorId(longValue(body.get("universitySupervisorId")));
        placement.setCompanySupervisorId(longValue(body.get("companySupervisorId")));
        String status = string(body.get("status"));
        if (status == null || status.isBlank()) {
            // Legacy binding kept the entity default when the field was absent.
            placement.setStatus(Placement.Status.PENDING);
        } else {
            try {
                placement.setStatus(Placement.Status.valueOf(status.trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Unknown status: " + status));
            }
        }
        resolveSupervisorIds(placement);
        Placement saved = placementService.create(placement);
        auditLogService.log(actor != null ? actor.getUsername() : "system",
                actor != null ? actor.getRole().name() : "ADMIN", "CREATE", "Placement",
                "Created placement for student ID: " + saved.getStudentId()
                        + " at company ID: " + saved.getCompanyId(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** P7 (R9): university approves an offer — status ASSIGNED + 3 notifications. */
    @PostMapping("/{id}/approve")
    // PC7: offer review is enforced as a university persona inside
    // PlacementPipelineService; INDUSTRIAL_SUPERVISOR is deliberately excluded.
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<?> approvePlacement(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Principal principal) {
        UserEntity actor = currentUser(principal);
        Long supervisorId = longValue(body.get("universitySupervisorId"));
        if (supervisorId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "A university supervisor is required."));
        }
        return ResponseEntity.ok(pipelineService.approve(actor, id, supervisorId));
    }

    /** P7 (R9): university declines an offer — status CANCELLED. */
    @PostMapping("/{id}/reject")
    // PC7: same deliberate exclusion as /approve — review is a university persona.
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<?> rejectPlacement(@PathVariable Long id, Principal principal) {
        UserEntity actor = currentUser(principal);
        return ResponseEntity.ok(pipelineService.reject(actor, id));
    }

    private UserEntity currentUser(Principal principal) {
        if (principal == null) {
            return null;
        }
        return userRepository.findByUsername(principal.getName()).orElse(null);
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

    @PutMapping("/{id}")
    public ResponseEntity<Placement> updatePlacement(@PathVariable Long id, @RequestBody Placement placement, Principal principal) {
        Placement existing = placementService.findById(id);
        if (existing != null) {
            if (placement.getUniversitySupervisorId() == null) {
                placement.setUniversitySupervisorId(existing.getUniversitySupervisorId());
            }
            if (placement.getCompanySupervisorId() == null) {
                placement.setCompanySupervisorId(existing.getCompanySupervisorId());
            }
        }
        resolveSupervisorIds(placement);
        Placement updated = placementService.update(id, placement);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "UPDATE", "Placement", "Updated placement ID: " + id + " (status: " + updated.getStatus() + ")", null);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlacement(@PathVariable Long id, Principal principal) {
        placementService.delete(id);
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "DELETE", "Placement", "Deleted placement ID: " + id, null);
        return ResponseEntity.noContent().build();
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
