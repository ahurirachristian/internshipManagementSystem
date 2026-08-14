package com.example.demo.controller;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthApiController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthApiController(AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .map(user -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("username", principal.getName());
                    result.put("role", user.getRole().name());
                    result.put("companyId", user.getCompanyId());
                    result.put("universityId", user.getUniversityId());
                    return result;
                })
                .orElseGet(() -> Map.<String, Object>of("username", principal.getName()));
    }

    @GetMapping("/roles")
    public List<String> getRoles() {
        return Arrays.stream(Role.values()).map(Role::name).toList();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, @RequestParam String password,
            @RequestParam(required = false) String role,
            HttpServletRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));
            request.getSession(true);
            SecurityContext context = SecurityContextHolder.getContext();
            context.setAuthentication(authentication);
            request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            // Determine actual role from the persisted user record for consistency
            String actualRole = userRepository.findByUsername(username)
                    .map(u -> u.getRole().name())
                    .orElse("STUDENT");

            Role selectedRole = parseRole(role);
            if (selectedRole != null && !selectedRole.name().equals(actualRole)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Selected role does not match your account role."));
            }

            String path = resolveHome(actualRole);
            String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();

            return ResponseEntity.ok(Map.of(
                    "username", username,
                    "role", actualRole,
                    "redirect", baseUrl + path));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "").trim();
        String confirmPassword = body.getOrDefault("confirmPassword", "").trim();
        String roleName = body.getOrDefault("role", "STUDENT").trim();

        if (username.isEmpty() || password.isEmpty() || confirmPassword.isEmpty() || roleName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }

        if (!password.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match."));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists."));
        }

        Role selectedRole = parseRole(roleName);
        if (selectedRole == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role selected."));
        }

        UserEntity user = new UserEntity(username, passwordEncoder.encode(password), selectedRole);
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Account created successfully."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String newPassword = body.getOrDefault("newPassword", "").trim();
        String confirmPassword = body.getOrDefault("confirmPassword", "").trim();

        if (username.isEmpty() || newPassword.isEmpty() || confirmPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match."));
        }

        return userRepository.findByUsername(username)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Username not found.")));
    }

    private Role parseRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return null;
        }
        try {
            return Role.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String resolveHome(String role) {
        return switch (role) {
            case "ADMIN" -> "/admin/dashboard";
            case "SUPERVISOR" -> "/university/dashboard";
            case "COMPANY" -> "/company/dashboard";
            default -> "/student/dashboard";
        };
    }
}
