package com.example.demo.student;

import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/student")
public class StudentProfileController {

    private final StudentService studentService;
    private final com.example.demo.university.UniversityRepository universityRepository;

    public StudentProfileController(StudentService studentService,
            com.example.demo.university.UniversityRepository universityRepository) {
        this.studentService = studentService;
        this.universityRepository = universityRepository;
    }

    @GetMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String editProfile(Principal principal, Model model) {
        StudentProfile profile = studentService.findByUsername(principal.getName())
                .orElseGet(() -> {
                    StudentProfile newProfile = new StudentProfile();
                    newProfile.setUsername(principal.getName());
                    return newProfile;
                });
        model.addAttribute("student", profile);
        return "student-edit";
    }

    @GetMapping("/universities/search")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    @ResponseBody
    public List<com.example.demo.university.University> searchUniversities(
            @RequestParam("q") String query) {
        return universityRepository.findByNameStartingWithIgnoreCase(query);
    }

    @PostMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String saveProfile(@ModelAttribute("student") StudentProfile profile, BindingResult result,
            Principal principal, Model model, RedirectAttributes redirectAttributes) {
        if (result.hasErrors()) {
            model.addAttribute("student", profile);
            return "student-edit";
        }
        profile.setUsername(principal.getName());
        studentService.findByUsername(principal.getName()).ifPresent(existing -> profile.setId(existing.getId()));
        studentService.save(profile);
        redirectAttributes.addFlashAttribute("successMessage", "Student profile saved successfully.");
        return "redirect:/student/dashboard";
    }
}
