package com.example.demo.auth;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AuthController {

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/login";
    }

    @GetMapping("/dashboard")
    public String dashboard(Principal principal, Authentication authentication, Model model) {
        model.addAttribute("username", principal.getName());
        boolean isStudent = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("STUDENT")
                        || authority.getAuthority().equals("ADMIN")
                        || authority.getAuthority().equals("SUPERVISOR"));
        boolean isSupervisor = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("SUPERVISOR")
                        || authority.getAuthority().equals("ADMIN"));
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ADMIN"));

        model.addAttribute("showStudentLink", isStudent);
        model.addAttribute("showSupervisorLink", isSupervisor);
        model.addAttribute("showAdminLink", isAdmin);
        return "dashboard";
    }

    private final com.example.demo.student.StudentService studentService;

    public AuthController(com.example.demo.student.StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public String studentDashboard(Principal principal, Model model) {
        studentService.findByUsername(principal.getName())
                .ifPresent(profile -> model.addAttribute("student", profile));
        return "student";
    }

    @GetMapping("/supervisor/dashboard")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String supervisorDashboard(Model model) {
        model.addAttribute("message", "Supervisor area");
        return "supervisor";
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasAuthority('ADMIN')")
    public String adminDashboard(Model model) {
        model.addAttribute("message", "Admin area");
        return "admin";
    }
}
