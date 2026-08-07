package com.example.demo.company;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    // GET /api/companies - list all companies
    @GetMapping
    public List<Company> getAllCompanies() {
        return companyService.findAll();
    }

    // GET /api/companies/search?q=... - search by name
    @GetMapping("/search")
    public List<Company> searchCompanies(@RequestParam("q") String query) {
        return companyService.search(query);
    }

    // GET /api/companies/{id} - get a single company by id
    @GetMapping("/{id}")
    public ResponseEntity<Company> getCompanyById(@PathVariable Long id) {
        return companyService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/companies - create a new company
    @PostMapping
    public ResponseEntity<Company> createCompany(@RequestBody Company company) {
        Company saved = companyService.save(company);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /api/companies/{id} - update an existing company
    @PutMapping("/{id}")
    public ResponseEntity<Company> updateCompany(@PathVariable Long id, @RequestBody Company company) {
        return companyService.findById(id)
                .map(existing -> {
                    existing.setName(company.getName());
                    existing.setLocation(company.getLocation());
                    existing.setProfile(company.getProfile());
                    existing.setDepartment(company.getDepartment());
                    existing.setFieldSupervisor(company.getFieldSupervisor());
                    return ResponseEntity.ok(companyService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/companies/{id} - delete a company
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        if (companyService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        companyService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}