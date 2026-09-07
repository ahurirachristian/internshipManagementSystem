package com.example.demo.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserService;
import com.example.demo.dto.UserDto;
import com.example.demo.service.AdminService;
import com.example.demo.audit.AuditLogService;
import java.security.Principal;

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final AdminService adminService;
    private final AuditLogService auditLogService;

    public AdminController(UserService userService, AdminService adminService, AuditLogService auditLogService) {
        this.userService = userService;
        this.adminService = adminService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/dashboard")
    public String adminDashboard(Model model) {
        populateModel(model, "dashboard");
        return "admin-dashboard";
    }

    @GetMapping("/students")
    public String studentList(Model model) {
        populateModel(model, "students");
        return "admin-dashboard";
    }

    @GetMapping("/diaries")
    public String diaryLogs(Model model) {
        populateModel(model, "diaries");
        return "admin-dashboard";
    }

    @GetMapping("/users")
    public String userManagement(Model model) {
        model.addAttribute("users", userService.getAllUsersDto());
        model.addAttribute("roles", Role.values());
        model.addAttribute("newUser", new UserDto());
        return "admin";
    }

    @PostMapping("/users")
    public String addUser(@ModelAttribute("newUser") UserDto userDto,
            RedirectAttributes redirectAttributes, Principal principal) {
        if (userService.usernameExists(userDto.getUsername())) {
            redirectAttributes.addFlashAttribute("errorMessage", "Username already exists.");
            return "redirect:/admin/users";
        }
        userService.createUser(userDto.getUsername(), userDto.getUsername() + "123", Role.valueOf(userDto.getRole()));
        auditLogService.log(principal != null ? principal.getName() : "admin", "ADMIN", "CREATE", "User", "Created user: " + userDto.getUsername() + " (role: " + userDto.getRole() + ")", null);
        redirectAttributes.addFlashAttribute("successMessage", "User created successfully.");
        return "redirect:/admin/users";
    }

    @PostMapping("/users/update")
    public String updateUser(@RequestParam Long id, @RequestParam String username,
            @RequestParam String role, RedirectAttributes redirectAttributes, Principal principal) {
        userService.updateUser(id, username, Role.valueOf(role));
        auditLogService.log(principal != null ? principal.getName() : "admin", "ADMIN", "UPDATE", "User", "Updated user: " + username + " (role: " + role + ")", null);
        redirectAttributes.addFlashAttribute("successMessage", "User updated successfully.");
        return "redirect:/admin/users";
    }

    @PostMapping("/users/delete")
    public String deleteUser(@RequestParam Long id, RedirectAttributes redirectAttributes, Principal principal) {
        userService.deleteUser(id);
        auditLogService.log(principal != null ? principal.getName() : "admin", "ADMIN", "DELETE", "User", "Deleted user ID: " + id, null);
        redirectAttributes.addFlashAttribute("successMessage", "User deleted successfully.");
        return "redirect:/admin/users";
    }

    private void populateModel(Model model, String activeTab) {
        model.addAttribute("activeTab", activeTab);
        model.addAttribute("totalStudents", adminService.countStudents());
        model.addAttribute("totalDiaryEntries", adminService.countDiaryEntries());
        model.addAttribute("activeStudents", adminService.countActiveStudents());
        model.addAttribute("averageDiaryEntriesPerStudent", adminService.getAverageDiaryEntriesPerStudent());
        model.addAttribute("students", adminService.getAllStudents());
        model.addAttribute("diaryEntries", adminService.getDiaryViews());
        model.addAttribute("diaryCounts", adminService.getDiaryCountsByStudentNo());
    }
}
