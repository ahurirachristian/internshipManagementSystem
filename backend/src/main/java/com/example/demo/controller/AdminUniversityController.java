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
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/universities")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUniversityController {

    private final UniversityService universityService;

    public AdminUniversityController(UniversityService universityService) {
        this.universityService = universityService;
    }

    @GetMapping
    public List<UniversityDto> getUniversities() {
        return universityService.getAllUniversities().stream()
                .map(universityService::toDto)
                .toList();
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportUniversitiesCsv() {
        List<UniversityDto> universities = universityService.getAllUniversities().stream()
                .map(universityService::toDto)
                .toList();
        String csv = universities.stream()
                .map(u -> String.join(",",
                        escape(u.getId()),
                        escape(u.getName()),
                        escape(u.getCode()),
                        escape(u.getLocation()),
                        escape(u.getEmail())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,University Name,Code,Location,Email\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"universities.csv\"")
                .body(body);
    }

    @PostMapping
    public ResponseEntity<?> createUniversity(@RequestBody UniversityRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(universityService.toDto(universityService.create(request)));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUniversity(@PathVariable Long id, @RequestBody UniversityRequest request) {
        try {
            return universityService.update(id, request)
                    .map(universityService::toDto)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUniversity(@PathVariable Long id) {
        universityService.deleteById(id);
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
