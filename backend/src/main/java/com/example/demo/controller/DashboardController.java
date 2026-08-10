package com.example.demo.controller;

import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import com.example.demo.service.DashboardService;
import com.example.demo.service.StudentService;

@Controller
public class DashboardController {

    private final DashboardService dashboardService;
    private final StudentService studentService;

    public DashboardController(DashboardService dashboardService, StudentService studentService) {
        this.dashboardService = dashboardService;
        this.studentService = studentService;
    }

    @GetMapping("/dashboard")
    public String dashboard(Principal principal, Authentication authentication, Model model) {
        model.addAllAttributes(dashboardService.getDashboardAttributes(principal, authentication));
        return "dashboard";
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
}