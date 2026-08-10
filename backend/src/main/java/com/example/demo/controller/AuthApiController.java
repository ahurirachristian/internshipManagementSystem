package com.example.demo.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
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
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthApiController {

    private final AuthenticationManager authenticationManager;

    public AuthApiController(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Principal principal) {
        return Map.of("username", principal.getName());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, @RequestParam String password,
            HttpServletRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));
            request.getSession(true);
            SecurityContext context = SecurityContextHolder.getContext();
            context.setAuthentication(authentication);
            request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            String role = "STUDENT";
            for (GrantedAuthority authority : authentication.getAuthorities()) {
                role = authority.getAuthority();
                break;
            }

            String path = switch (role) {
                case "ADMIN" -> "/admin/dashboard";
                case "SUPERVISOR" -> "/university/dashboard";
                case "COMPANY" -> "/company/dashboard";
                default -> "/student/dashboard";
            };

            String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();

            return ResponseEntity.ok(Map.of(
                    "username", username,
                    "role", role,
                    "redirect", baseUrl + path));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }
    }
}