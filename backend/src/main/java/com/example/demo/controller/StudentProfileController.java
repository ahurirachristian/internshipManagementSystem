package com.example.demo.controller;

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
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.dto.StudentProfileDto;
import com.example.demo.service.StudentService;
import com.example.demo.auth.UserRepository;
import com.example.demo.service.UniversityService;

@Controller
@RequestMapping("/student")
public class StudentProfileController {

    private final StudentService studentService;
    private final UserRepository userRepository;
    private final UniversityService universityService;

    public StudentProfileController(StudentService studentService, UserRepository userRepository,
            UniversityService universityService) {
        this.studentService = studentService;
        this.userRepository = userRepository;
        this.universityService = universityService;
    }

    @GetMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String editProfile(Principal principal, Model model) {
        StudentProfileDto profile = studentService.findOrCreateByUsername(principal.getName())
                .map(studentService::toDto)
                .orElse(new StudentProfileDto());
        model.addAttribute("student", profile);
        model.addAttribute("userRole", userRepository.findByUsername(principal.getName()).map(u -> u.getRole().name()).orElse("STUDENT"));
        model.addAttribute("universities", universityService.getAllUniversities());
        return "student-edit";
    }

    @PostMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String saveProfile(@ModelAttribute("student") StudentProfileDto profileDto, BindingResult result,
            Principal principal, Model model, RedirectAttributes redirectAttributes) {
        if (result.hasErrors()) {
            model.addAttribute("student", profileDto);
            model.addAttribute("universities", universityService.getAllUniversities());
            return "student-edit";
        }
        studentService.saveProfile(profileDto, principal.getName());
        redirectAttributes.addFlashAttribute("successMessage", "Student profile saved successfully.");
        return "redirect:/student/details";
    }

    @GetMapping("/details")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String details(Principal principal, Model model) {
        StudentProfileDto profile = studentService.findOrCreateByUsername(principal.getName())
                .map(studentService::toDto)
                .orElse(new StudentProfileDto());
        model.addAttribute("student", profile);
        model.addAttribute("userRole", userRepository.findByUsername(principal.getName()).map(u -> u.getRole().name()).orElse("STUDENT"));
        return "student-details";
    }

    @GetMapping("/diary")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String diary(Principal principal, Model model) {
        model.addAttribute("diaryEntry", new com.example.demo.student.DayDiary());
        model.addAttribute("diaryEntries", studentService.findDiaryEntriesByUsername(principal.getName()));
        model.addAttribute("student", studentService.findByUsername(principal.getName()).map(studentService::toDto).orElse(new StudentProfileDto()));
        model.addAttribute("userRole", userRepository.findByUsername(principal.getName()).map(u -> u.getRole().name()).orElse("STUDENT"));
        return "student-diary";
    }
}