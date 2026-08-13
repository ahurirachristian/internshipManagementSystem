package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserService;
import com.example.demo.dto.UserDto;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUserApiController {

    private final UserService userService;

    public AdminUserApiController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserDto> getUsers() {
        return userService.getAllUsersDto();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String roleName = body.getOrDefault("role", "").trim();

        if (username.isEmpty() || roleName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and role are required."));
        }
        if (userService.usernameExists(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists."));
        }
        Role role = parseRole(roleName);
        if (role == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role selected."));
        }

        UserEntity user = userService.createUser(username, username + "123", role);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.toDto(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        if (userService.getUserById(id) == null) {
            return ResponseEntity.notFound().build();
        }

        String username = body.getOrDefault("username", "").trim();
        String roleName = body.getOrDefault("role", "").trim();

        if (username.isEmpty() || roleName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and role are required."));
        }
        Role role = parseRole(roleName);
        if (role == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role selected."));
        }

        return ResponseEntity.ok(userService.updateUser(id, username, role));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.getUserById(id) == null) {
            return ResponseEntity.notFound().build();
        }
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    private Role parseRole(String roleName) {
        try {
            return Role.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
