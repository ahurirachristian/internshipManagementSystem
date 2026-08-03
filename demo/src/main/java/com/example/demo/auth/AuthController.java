package com.example.demo.auth;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AuthController {

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/dashboard")
    public String dashboard(Principal principal, Model model) {
        model.addAttribute("username", principal.getName());
        return "dashboard";
    }

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasAuthority('STUDENT')")
    public String studentDashboard(Model model) {
        model.addAttribute("message", "Student area");
        return "student";
    }

    @GetMapping("/supervisor/dashboard")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
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
