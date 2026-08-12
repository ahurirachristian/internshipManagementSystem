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

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final AdminService adminService;

    public AdminController(UserService userService, AdminService adminService) {
        this.userService = userService;
        this.adminService = adminService;
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
            RedirectAttributes redirectAttributes) {
        if (userService.usernameExists(userDto.getUsername())) {
            redirectAttributes.addFlashAttribute("errorMessage", "Username already exists.");
            return "redirect:/admin/users";
        }
        userService.createUser(userDto.getUsername(), userDto.getUsername() + "123", Role.valueOf(userDto.getRole()));
        redirectAttributes.addFlashAttribute("successMessage", "User created successfully.");
        return "redirect:/admin/users";
    }

    @PostMapping("/users/update")
    public String updateUser(@RequestParam Long id, @RequestParam String username,
            @RequestParam String role, RedirectAttributes redirectAttributes) {
        userService.updateUser(id, username, Role.valueOf(role));
        redirectAttributes.addFlashAttribute("successMessage", "User updated successfully.");
        return "redirect:/admin/users";
    }

    @PostMapping("/users/delete")
    public String deleteUser(@RequestParam Long id, RedirectAttributes redirectAttributes) {
        userService.deleteUser(id);
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
        model.addAttribute("diaryEntries", adminService.getAllDiaryEntries());
        model.addAttribute("diaryCounts", adminService.getDiaryCountsByUsername());
    }
}
