package com.example.demo.company;

import java.util.List;
import org.springframework.http.HttpHeaders;
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
import com.example.demo.dto.CompanyRequest;
import com.example.demo.audit.AuditLogService;
import jakarta.validation.Valid;
import java.security.Principal;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;
    private final AuditLogService auditLogService;

    public CompanyController(CompanyService companyService, AuditLogService auditLogService) {
        this.companyService = companyService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<Company> getAllCompanies() {
        return companyService.findAll();
    }

    @GetMapping("/search")
    public List<Company> searchCompanies(@RequestParam("q") String query) {
        return companyService.search(query);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Company> getCompanyById(@PathVariable Long id) {
        return companyService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCompaniesCsv() {
        List<Company> companies = companyService.findAll();
        String csv = companies.stream()
                .map(c -> String.join(",",
                        escape(c.getId()),
                        escape(c.getName()),
                        escape(c.getCountry()),
                        escape(c.getCity()),
                        escape(c.getEmail()),
                        escape(c.getWebsite()),
                        escape(c.getPostalAddress()),
                        escape(c.getPhysicalAddress())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Name,Country,City,Email,Website,Postal Address,Physical Address\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"companies.csv\"")
                .body(body);
    }

    @PostMapping
    public ResponseEntity<Company> createCompany(@Valid @RequestBody CompanyRequest request, Principal principal) {
        Company company = mapRequestToEntity(request);
        Company saved = companyService.save(company);
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "CREATE", "Company", "Created company: " + saved.getName(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Company> updateCompany(@PathVariable Long id, @Valid @RequestBody CompanyRequest request, Principal principal) {
        return companyService.findById(id)
                .map(existing -> {
                    mapRequestToEntity(request, existing);
                    Company saved = companyService.save(existing);
                    auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "UPDATE", "Company", "Updated company: " + saved.getName(), null);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id, Principal principal) {
        Company company = companyService.findById(id).orElse(null);
        if (company == null) {
            return ResponseEntity.notFound().build();
        }
        String companyName = company.getName();
        companyService.deleteById(id);
        auditLogService.log(principal != null ? principal.getName() : "system", "ADMIN", "DELETE", "Company", "Deleted company: " + companyName, null);
        return ResponseEntity.noContent().build();
    }

    private Company mapRequestToEntity(CompanyRequest request) {
        Company company = new Company();
        mapRequestToEntity(request, company);
        return company;
    }

    private void mapRequestToEntity(CompanyRequest request, Company company) {
        company.setName(request.getName());
        company.setRegistrationNumber(request.getRegistrationNumber());
        company.setIndustry(request.getIndustry());
        company.setWebsite(request.getWebsite());
        company.setEmail(request.getEmail());
        company.setPhone(request.getPhone());
        company.setCountry(request.getCountry());
        company.setCity(request.getCity());
        company.setPhysicalAddress(request.getPhysicalAddress());
        company.setPostalAddress(request.getPostalAddress());
        company.setDescription(request.getDescription());
        company.setLogoUrl(request.getLogoUrl());
        if (request.getSize() != null && !request.getSize().isEmpty()) {
            try {
                company.setSize(Company.Size.valueOf(request.getSize()));
            } catch (IllegalArgumentException ignored) {
            }
        }
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
