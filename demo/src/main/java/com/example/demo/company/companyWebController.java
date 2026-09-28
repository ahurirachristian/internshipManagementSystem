package com.example.demo.company;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Optional;

@Controller
@RequestMapping("/company")
public class CompanyWebController {

    private final CompanyService companyService;

    public CompanyWebController(CompanyService companyService) {
        this.companyService = companyService;
    }

    // 1. This handles the general company list view at /company
    @GetMapping
    public String viewCompanies(Model model) {
        model.addAttribute("companies", companyService.getAllCompanies());
        return "company"; // renders company.html
    }

    // 2. This handles the styled dashboard profile view at /company/profile
    @GetMapping("/profile")
    public String viewCompanyProfile(Model model) {
        // Simulating the logged-in company (ID 1 for Airtel Uganda)
        Long loggedInCompanyId = 1L;
        
        Optional<Company> company = companyService.getCompanyById(loggedInCompanyId);

        if (company.isPresent()) {
            model.addAttribute("company", company.get());
            return "company-profile"; // renders company-profile.html
        } else {
            return "redirect:/error";
        }
    }
}