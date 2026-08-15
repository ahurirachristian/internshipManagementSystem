package com.example.demo.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;

@RestController
@RequestMapping("/api/supervisors")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
public class SupervisorController {

    private final UserRepository userRepository;

    public SupervisorController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserEntity> getSupervisors(@RequestParam(required = false) String type) {
        List<UserEntity> supervisors = userRepository.findByRole(Role.SUPERVISOR);
        if (type == null || type.isBlank()) {
            return supervisors;
        }
        String upperType = type.trim().toUpperCase();
        return supervisors.stream()
                .filter(user -> {
                    if ("UNIVERSITY".equals(upperType)) {
                        return user.getUniversityId() != null;
                    }
                    if ("COMPANY".equals(upperType)) {
                        return user.getCompanyId() != null;
                    }
                    return true;
                })
                .toList();
    }
}
