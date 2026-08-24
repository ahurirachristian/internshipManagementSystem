package com.example.demo.company;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.util.List;

@Controller
@RequestMapping("/company")
public class CompanyWebController {

    private final CompanyRepository companyRepository;
    private final CompanyService companyService;

    public CompanyWebController(CompanyRepository companyRepository, CompanyService companyService) {
        this.companyRepository = companyRepository;
        this.companyService = companyService;
    }

    @GetMapping
    public String viewCompanies(Authentication authentication, Model model) {
        List<Company> companies = companyRepository.findAll();
        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("companies", companies);
        return "company";
    }

    @GetMapping("/{id}")
    public String viewCompanyProfile(@PathVariable Long id, Authentication authentication, Model model) {
        model.addAttribute("userRole", resolveRole(authentication));
        return companyRepository.findById(id)
                .map(company -> {
                    model.addAttribute("company", company);
                    return "Company-Profile";
                })
                .orElse("redirect:/company");
    }

    @GetMapping("/add")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String showAddForm(Authentication authentication, Model model) {
        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("company", new Company());
        model.addAttribute("isEdit", false);
        return "company-form";
    }

    @PostMapping("/save")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String saveCompany(@ModelAttribute("company") Company company, RedirectAttributes redirectAttributes) {
        company.setId(null);
        Company saved = companyService.save(company);
        redirectAttributes.addFlashAttribute("successMessage", "Company \"" + saved.getName() + "\" added successfully.");
        return "redirect:/company";
    }

    @GetMapping("/edit/{id}")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String showEditForm(@PathVariable Long id, Authentication authentication, Model model) {
        model.addAttribute("userRole", resolveRole(authentication));
        return companyRepository.findById(id)
                .map(company -> {
                    model.addAttribute("company", company);
                    model.addAttribute("isEdit", true);
                    return "company-form";
                })
                .orElse("redirect:/company");
    }

    @PostMapping("/update")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String updateCompany(@ModelAttribute("company") Company formData, RedirectAttributes redirectAttributes) {
        return companyRepository.findById(formData.getId())
                .map(existing -> {
                    existing.setName(formData.getName());
                    existing.setRegistrationNumber(formData.getRegistrationNumber());
                    existing.setIndustry(formData.getIndustry());
                    existing.setSize(formData.getSize());
                    existing.setEmail(formData.getEmail());
                    existing.setPhone(formData.getPhone());
                    existing.setWebsite(formData.getWebsite());
                    existing.setCountry(formData.getCountry());
                    existing.setCity(formData.getCity());
                    existing.setPhysicalAddress(formData.getPhysicalAddress());
                    existing.setPostalAddress(formData.getPostalAddress());
                    existing.setDescription(formData.getDescription());
                    existing.setLogoUrl(formData.getLogoUrl());
                    companyService.save(existing);
                    redirectAttributes.addFlashAttribute("successMessage", "Company \"" + existing.getName() + "\" updated successfully.");
                    return "redirect:/company";
                })
                .orElse("redirect:/company");
    }

    @GetMapping("/delete/{id}")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String deleteCompany(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        companyService.findById(id)
                .ifPresent(company -> redirectAttributes.addFlashAttribute(
                        "successMessage", "Company \"" + company.getName() + "\" deleted successfully."));
        companyService.deleteById(id);
        return "redirect:/company";
    }

    private String resolveRole(Authentication authentication) {
        if (authentication != null) {
            for (GrantedAuthority authority : authentication.getAuthorities()) {
                if ("ADMIN".equals(authority.getAuthority())
                        || "SUPERVISOR".equals(authority.getAuthority())) {
                    return authority.getAuthority();
                }
            }
        }
        return "STUDENT";
    }
}
