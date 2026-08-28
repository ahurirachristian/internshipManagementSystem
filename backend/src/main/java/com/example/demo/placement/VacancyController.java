package com.example.demo.placement;

import java.util.List;
import jakarta.validation.Valid;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/vacancies")
public class VacancyController {

    private final VacancyService vacancyService;

    public VacancyController(VacancyService vacancyService) {
        this.vacancyService = vacancyService;
    }

    @GetMapping
    public Page<Vacancy> getAllVacancies(@PageableDefault(size = 20) Pageable pageable) {
        return vacancyService.findAll(pageable);
    }

    @GetMapping("/company/{companyId}")
    public List<Vacancy> getVacanciesByCompany(@PathVariable Long companyId) {
        return vacancyService.findByCompanyId(companyId);
    }

    @GetMapping("/status")
    public List<Vacancy> getVacanciesByStatus(@RequestParam String status) {
        return vacancyService.findByStatus(status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vacancy> getVacancyById(@PathVariable Long id) {
        return vacancyService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Vacancy> createVacancy(@Valid @RequestBody Vacancy vacancy) {
        Vacancy saved = vacancyService.save(vacancy);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Vacancy> updateVacancy(@PathVariable Long id, @Valid @RequestBody Vacancy vacancy) {
        return vacancyService.findById(id)
                .map(existing -> {
                    existing.setTitle(vacancy.getTitle());
                    existing.setDescription(vacancy.getDescription());
                    existing.setCompanyId(vacancy.getCompanyId());
                    existing.setLocation(vacancy.getLocation());
                    existing.setRequirements(vacancy.getRequirements());
                    existing.setStatus(vacancy.getStatus());
                    existing.setDeadline(vacancy.getDeadline());
                    return ResponseEntity.ok(vacancyService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteVacancy(@PathVariable Long id) {
        if (vacancyService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        vacancyService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
