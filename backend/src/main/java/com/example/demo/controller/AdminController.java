package com.example.demo.controller;

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