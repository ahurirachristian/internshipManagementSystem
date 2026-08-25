package com.example.demo.company;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@Service
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final StudentProfileRepository studentProfileRepository;

    public CompanyService(CompanyRepository companyRepository,
            StudentProfileRepository studentProfileRepository) {
        this.companyRepository = companyRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    public List<Company> getAllCompanies() {
        return companyRepository.findAll();
    }

    public Optional<Company> getCompanyById(Long id) {
        return companyRepository.findById(id);
    }

    public List<Company> findAll() {
        return companyRepository.findAll();
    }

    public Optional<Company> findById(Long id) {
        return companyRepository.findById(id);
    }

    public List<Company> search(String query) {
        return companyRepository.findByNameContainingIgnoreCase(query);
    }

    public Company save(Company company) {
        return companyRepository.save(company);
    }

    public void deleteById(Long id) {
        companyRepository.deleteById(id);
    }

    /**
     * Find students placed at a company. Since StudentProfile no longer has a companyId FK,
     * we look up the company name and match against the organisation field.
     */
    public List<StudentProfile> findStudentsByCompanyId(Long companyId) {
        if (companyId == null) {
            return List.of();
        }
        return companyRepository.findById(companyId)
                .map(company -> studentProfileRepository.findByOrganisationContainingIgnoreCase(company.getName()))
                .orElse(List.of());
    }
}
