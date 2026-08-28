package com.example.demo.controller;

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
import com.example.demo.dto.UniversityDto;
import com.example.demo.dto.UniversityRequest;
import com.example.demo.service.UniversityService;
import com.example.demo.audit.AuditLogService;
import java.security.Principal;

@RestController
@RequestMapping("/api/universities")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUniversityController {

    private final UniversityService universityService;
    private final AuditLogService auditLogService;

    public AdminUniversityController(UniversityService universityService, AuditLogService auditLogService) {
        this.universityService = universityService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<UniversityDto> getUniversities() {
        return universityService.getAllUniversities().stream()
                .map(universityService::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UniversityDto> getUniversity(@PathVariable Integer id) {
        return universityService.findById(id)
                .map(universityService::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportUniversitiesCsv() {
        List<UniversityDto> universities = universityService.getAllUniversities().stream()
                .map(universityService::toDto)
                .toList();
        String csv = universities.stream()
                .map(u -> String.join(",",
                        escape(u.getUniversityId()),
                        escape(u.getShortForm()),
                        escape(u.getFullName()),
                        escape(u.getCountry()),
                        escape(u.getEstablishedYear())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,ShortForm,FullName,Country,EstablishedYear\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"universities.csv\"")
                .body(body);
    }

    @PostMapping
    public ResponseEntity<?> createUniversity(@RequestBody UniversityRequest request, Principal principal) {
        try {
            var saved = universityService.create(request);
            auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "CREATE", "University", "Created university: " + saved.getFullName(), null);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(universityService.toDto(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUniversity(@PathVariable Integer id, @RequestBody UniversityRequest request, Principal principal) {
        try {
            return universityService.update(id, request)
                    .map(saved -> {
                        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "UPDATE", "University", "Updated university: " + saved.getFullName(), null);
                        return universityService.toDto(saved);
                    })
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUniversity(@PathVariable Integer id, Principal principal) {
        var uni = universityService.findById(id);
        universityService.deleteById(id);
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "DELETE", "University", "Deleted university ID: " + id + (uni.isPresent() ? " (" + uni.get().getFullName() + ")" : ""), null);
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
