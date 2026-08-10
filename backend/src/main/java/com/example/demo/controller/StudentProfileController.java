package com.example.demo.controller;

import java.security.Principal;
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

@Controller
@RequestMapping("/student")
public class StudentProfileController {

    private final StudentService studentService;

    public StudentProfileController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String editProfile(Principal principal, Model model) {
        StudentProfileDto profile = studentService.findOrCreateByUsername(principal.getName())
                .map(studentService::toDto)
                .orElse(new StudentProfileDto());
        model.addAttribute("student", profile);
        return "student-edit";
    }

    @PostMapping("/profile/edit")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String saveProfile(@ModelAttribute("student") StudentProfileDto profileDto, BindingResult result,
            Principal principal, Model model, RedirectAttributes redirectAttributes) {
        if (result.hasErrors()) {
            model.addAttribute("student", profileDto);
            return "student-edit";
        }
        studentService.saveProfile(profileDto, principal.getName());
        redirectAttributes.addFlashAttribute("successMessage", "Student profile saved successfully.");
        return "redirect:/student/dashboard";
    }
}