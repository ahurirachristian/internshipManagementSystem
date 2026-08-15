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
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
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
                        escape(c.getLocation()),
                        escape(c.getDepartment()),
                        escape(c.getEmail()),
                        escape(c.getWebsite()),
                        escape(c.getProfile() != null ? c.getProfile().split(" \\| ")[0] : ""),
                        escape(c.getProfile() != null && c.getProfile().contains(" | ") ? c.getProfile().split(" \\| ")[1] : "")))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Name,Country,Branch,Email,Website,Postal Address,Physical Address\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"companies.csv\"")
                .body(body);
    }

    @PostMapping
    public ResponseEntity<Company> createCompany(@Valid @RequestBody CompanyRequest request) {
        Company company = new Company();
        company.setName(request.getName());
        company.setLocation(request.getCountry());
        company.setEmail(request.getEmail());
        company.setWebsite(request.getWebsite());
        company.setProfile((request.getPostalAddress() != null ? request.getPostalAddress() : "") + " | " + (request.getPhysicalAddress() != null ? request.getPhysicalAddress() : ""));
        company.setDepartment(request.getBranch());
        company.setFieldSupervisor("");
        company.setRoles("");
        Company saved = companyService.save(company);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Company> updateCompany(@PathVariable Long id, @Valid @RequestBody CompanyRequest request) {
        return companyService.findById(id)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setLocation(request.getCountry());
                    existing.setEmail(request.getEmail());
                    existing.setWebsite(request.getWebsite());
                    existing.setProfile((request.getPostalAddress() != null ? request.getPostalAddress() : "") + " | " + (request.getPhysicalAddress() != null ? request.getPhysicalAddress() : ""));
                    existing.setDepartment(request.getBranch());
                    return ResponseEntity.ok(companyService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        if (companyService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        companyService.deleteById(id);
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
