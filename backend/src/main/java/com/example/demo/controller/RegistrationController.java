package com.example.demo.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserService;

@Controller
public class RegistrationController {

    private final UserService userService;

    public RegistrationController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/register")
    public String showRegistrationForm(Model model) {
        model.addAttribute("roles", Role.values());
        return "register";
    }

    @PostMapping("/register")
    public String register(
            @RequestParam String username,
            @RequestParam String password,
            @RequestParam Role role,
            RedirectAttributes redirectAttributes) {
        if (userService.usernameExists(username)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Username is already taken.");
            return "redirect:/register";
        }
        userService.createUser(username, password, role);
        redirectAttributes.addFlashAttribute("successMessage", "Account created successfully. Please log in.");
        return "redirect:/login";
    }
}