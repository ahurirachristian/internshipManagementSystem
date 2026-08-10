package com.example.demo.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import com.example.demo.service.AdminService;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('ADMIN')")
    public String adminDashboard(Authentication authentication, Model model) {
        populateModel(model, "students", authentication);
        return "admin-dashboard";
    }

    @GetMapping("/students")
    @PreAuthorize("hasAuthority('ADMIN')")
    public String studentList(Authentication authentication, Model model) {
        populateModel(model, "students", authentication);
        return "admin-dashboard";
    }

    @GetMapping("/diaries")
    @PreAuthorize("hasAuthority('ADMIN')")
    public String diaryLogs(Authentication authentication, Model model) {
        populateModel(model, "diaries", authentication);
        return "admin-dashboard";
    }

    private void populateModel(Model model, String activeTab, Authentication authentication) {
        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("activeTab", activeTab);
        model.addAttribute("totalStudents", adminService.countStudents());
        model.addAttribute("totalDiaryEntries", adminService.countDiaryEntries());
        model.addAttribute("activeStudents", adminService.countActiveStudents());
        model.addAttribute("averageDiaryEntriesPerStudent", adminService.getAverageDiaryEntriesPerStudent());
        model.addAttribute("students", adminService.getAllStudents());
        model.addAttribute("diaryEntries", adminService.getAllDiaryEntries());
        model.addAttribute("diaryCounts", adminService.getDiaryCountsByUsername());
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
