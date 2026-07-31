package com.example.demo.auth;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

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
    public String dashboard(Principal principal, Model model) {
        model.addAttribute("username", principal.getName());
        return "dashboard";
    }

    @GetMapping("/api/me")
    @ResponseBody
    public Map<String, Object> currentUser(Principal principal) {
        return Map.of("username", principal.getName());
    }

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasRole('STUDENT')")
    public String studentDashboard(Model model) {
        model.addAttribute("message", "Student area");
        return "student";
    }

    @GetMapping("/supervisor/dashboard")
    @PreAuthorize("hasRole('SUPERVISOR')")
    public String supervisorDashboard(Model model) {
        model.addAttribute("message", "Supervisor area");
        return "supervisor";
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminDashboard(Model model) {
        model.addAttribute("message", "Admin area");
        return "admin";
    }
}
