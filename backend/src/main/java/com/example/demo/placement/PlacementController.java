package com.example.demo.placement;

import java.util.List;
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
import java.security.Principal;

@RestController
@RequestMapping("/api/placements")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
public class PlacementController {

    private final PlacementService placementService;
    private final AuditLogService auditLogService;

    public PlacementController(PlacementService placementService, AuditLogService auditLogService) {
        this.placementService = placementService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<Placement> getPlacements() {
        return placementService.findAll();
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

    @PostMapping
    public ResponseEntity<Placement> createPlacement(@RequestBody Placement placement, Principal principal) {
        Placement saved = placementService.create(placement);
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "CREATE", "Placement", "Created placement for student ID: " + saved.getStudentId() + " at company ID: " + saved.getCompanyId(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Placement> updatePlacement(@PathVariable Long id, @RequestBody Placement placement, Principal principal) {
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
