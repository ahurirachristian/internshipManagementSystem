package com.example.demo.company;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import java.util.List;

@Controller
@RequestMapping("/company")
public class CompanyWebController {

    private final CompanyRepository companyRepository;

    public CompanyWebController(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public String viewCompanies(Model model) {
        List<Company> companies = companyRepository.findAll();
        model.addAttribute("companies", companies);
        return "company";
    }

    @GetMapping("/{id}")
    public String viewCompanyProfile(@PathVariable Long id, Model model) {
        return companyRepository.findById(id)
                .map(company -> {
                    model.addAttribute("company", company);
                    return "Company-Profile";
                })
                .orElse("redirect:/company");
    }
}
