package com.example.demo.controller;

<<<<<<< HEAD
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
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

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public String adminDashboard(Model model) {
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
            return "redirect:/admin/dashboard";
        }
        userService.createUser(userDto.getUsername(), userDto.getUsername() + "123", Role.valueOf(userDto.getRole()));
        redirectAttributes.addFlashAttribute("successMessage", "User created successfully.");
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/users/update")
    public String updateUser(@RequestParam Long id, @RequestParam String username,
            @RequestParam String role, RedirectAttributes redirectAttributes) {
        userService.updateUser(id, username, Role.valueOf(role));
        redirectAttributes.addFlashAttribute("successMessage", "User updated successfully.");
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/users/delete")
    public String deleteUser(@RequestParam Long id, RedirectAttributes redirectAttributes) {
        userService.deleteUser(id);
        redirectAttributes.addFlashAttribute("successMessage", "User deleted successfully.");
        return "redirect:/admin/dashboard";
    }
}
=======
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
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
