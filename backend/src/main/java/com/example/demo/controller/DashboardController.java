package com.example.demo.controller;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.company.CompanyService;
import com.example.demo.service.StudentService;
import com.example.demo.service.UniversityService;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.example.demo.dto.StudentCredentialRequest;
import com.example.demo.student.DayDiaryRepository;

@Controller
public class DashboardController {

    private static final String STUDENT_HOME = "/student/dashboard";
    private static final String UNIVERSITY_HOME = "/university/dashboard";
    private static final String ADMIN_HOME = "/admin/dashboard";
    private static final String COMPANY_HOME = "/company/dashboard";

    private final StudentService studentService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyService companyService;
    private final StudentProfileRepository studentProfileRepository;
    private final UniversityRepository universityRepository;
    private final UniversityService universityService;
    private final DayDiaryRepository dayDiaryRepository;

    public DashboardController(StudentService studentService,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            CompanyService companyService,
            StudentProfileRepository studentProfileRepository,
            UniversityRepository universityRepository,
            UniversityService universityService,
            DayDiaryRepository dayDiaryRepository) {
        this.studentService = studentService;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.companyService = companyService;
        this.studentProfileRepository = studentProfileRepository;
        this.universityRepository = universityRepository;
        this.universityService = universityService;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    @GetMapping("/dashboard")
    public String dashboard(Authentication authentication) {
        return "redirect:" + resolveHome(authentication);
    }

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'SUPERVISOR', 'ADMIN')")
    public String studentDashboard(Principal principal, Authentication authentication, Model model) {
        studentService.findByUsername(principal.getName())
                .ifPresent(profile -> model.addAttribute("student", profile));
        model.addAttribute("diaryEntry", new com.example.demo.student.DayDiary());
        model.addAttribute("diaryEntries", studentService.findDiaryEntriesByUsername(principal.getName()));
        model.addAttribute("userRole", resolveRole(authentication));
        return "student";
    }

    @GetMapping("/supervisor/overview")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityOverview() {
        return "redirect:" + UNIVERSITY_HOME;
    }
<<<<<<< HEAD
=======

    @GetMapping("/company/dashboard")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'ADMIN', 'SUPERVISOR')")
    public String companyDashboard(Principal principal, Authentication authentication, Model model) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Long companyId = (user != null) ? user.getCompanyId() : null;

        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId).orElse(null);
        }

        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("company", company);
        model.addAttribute("companyId", companyId);
        model.addAttribute("students", companyService.findStudentsByCompanyId(companyId));
        return "company";
    }

    @GetMapping("/university/dashboard")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityDashboard(Model model, Principal principal, Authentication authentication) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Long universityId = (user != null) ? user.getUniversityId() : null;

        University university = null;
        if (universityId != null) {
            university = universityRepository.findById(universityId).orElse(null);
        }

        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("students", universityService.getStudentsBySupervisor(principal.getName()));
        model.addAttribute("universities", universityService.getUniversities());
        model.addAttribute("university", university);
        model.addAttribute("credentialRequest", new StudentCredentialRequest());
        model.addAttribute("currentUser", principal.getName());
        return "university";
    }

    @PostMapping("/university/students/credential")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String createStudentCredential(@ModelAttribute("credentialRequest") StudentCredentialRequest request,
            Principal principal, Model model, Authentication authentication, RedirectAttributes redirectAttributes) {
        try {
            universityService.createStudentCredential(request, principal.getName());
            redirectAttributes.addFlashAttribute("successMessage", "Student credentials created successfully.");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/university/dashboard";
    }

    @GetMapping("/students/edit/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String showEditStudentForm(@PathVariable Long id, Principal principal, Authentication authentication,
            Model model, RedirectAttributes redirectAttributes) {
        return studentProfileRepository.findById(id)
                .map(student -> {
                    model.addAttribute("userRole", resolveRole(authentication));
                    model.addAttribute("student", student);
                    model.addAttribute("backUrl", resolveBackUrl(authentication));
                    return "student-edit";
                })
                .orElseGet(() -> {
                    redirectAttributes.addFlashAttribute("errorMessage", "Student not found.");
                    return "redirect:" + resolveHome(authentication);
                });
    }

    @PutMapping("/students/edit/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String updateStudent(@PathVariable Long id, @ModelAttribute("student") StudentProfile formData,
            Authentication authentication, RedirectAttributes redirectAttributes) {
        return studentProfileRepository.findById(id)
                .map(existing -> {
                    existing.setFirstName(formData.getFirstName());
                    existing.setLastName(formData.getLastName());
                    existing.setEmail(formData.getEmail());
                    existing.setStudentNumber(formData.getStudentNumber());
                    existing.setRegistrationNumber(formData.getRegistrationNumber());
                    existing.setDegreeProgram(formData.getDegreeProgram());
                    existing.setYearOfStudy(formData.getYearOfStudy());
                    existing.setPhoneNumber(formData.getPhoneNumber());
                    existing.setInternshipCompany(formData.getInternshipCompany());
                    existing.setUniversitySupervisor(formData.getUniversitySupervisor());
                    existing.setIndustrialSupervisorId(formData.getIndustrialSupervisorId());
                    existing.setCompanyId(formData.getCompanyId());
                    existing.setPictureUrl(formData.getPictureUrl());
                    studentProfileRepository.save(existing);
                    redirectAttributes.addFlashAttribute("successMessage", "Student \"" + existing.getFirstName() + " " + existing.getLastName() + "\" updated successfully.");
                    return "redirect:" + resolveHome(authentication);
                })
                .orElseGet(() -> {
                    redirectAttributes.addFlashAttribute("errorMessage", "Student not found.");
                    return "redirect:" + resolveHome(authentication);
                });
    }

    @DeleteMapping("/students/delete/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String deleteStudent(@PathVariable Long id, Authentication authentication,
            RedirectAttributes redirectAttributes) {
        studentProfileRepository.findById(id)
                .ifPresent(student -> {
                    redirectAttributes.addFlashAttribute(
                            "successMessage", "Student \"" + student.getFirstName() + " " + student.getLastName() + "\" deleted successfully.");
                    // Clean up related diary entries to avoid FK constraint failures
                    dayDiaryRepository.findAll().stream()
                            .filter(diary -> diary.getStudentProfile() != null
                                    && diary.getStudentProfile().getId().equals(student.getId()))
                            .forEach(dayDiaryRepository::delete);
                });
        studentProfileRepository.deleteById(id);
        return "redirect:" + resolveHome(authentication);
    }

    private String resolveBackUrl(Authentication authentication) {
        String role = resolveRole(authentication);
        if ("COMPANY".equals(role)) {
            return COMPANY_HOME;
        }
        if ("SUPERVISOR".equals(role)) {
            return UNIVERSITY_HOME;
        }
        return ADMIN_HOME;
    }

    private String resolveHome(Authentication authentication) {
        String role = resolveRole(authentication);
        if ("ADMIN".equals(role)) {
            return ADMIN_HOME;
        }
        if ("SUPERVISOR".equals(role)) {
            return UNIVERSITY_HOME;
        }
        if ("COMPANY".equals(role)) {
            return COMPANY_HOME;
        }
        return STUDENT_HOME;
    }

    private String resolveRole(Authentication authentication) {
        if (authentication != null) {
            for (GrantedAuthority authority : authentication.getAuthorities()) {
                if ("ADMIN".equals(authority.getAuthority())
                        || "SUPERVISOR".equals(authority.getAuthority())
                        || "COMPANY".equals(authority.getAuthority())) {
                    return authority.getAuthority();
                }
            }
        }
        return "STUDENT";
    }
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
}