package com.example.demo.service;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    public Map<String, Object> getDashboardAttributes(Principal principal, Authentication authentication) {
        boolean isStudent = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("STUDENT")
                        || authority.getAuthority().equals("ADMIN")
                        || authority.getAuthority().equals("SUPERVISOR"));
        boolean isSupervisor = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("SUPERVISOR")
                        || authority.getAuthority().equals("ADMIN"));
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ADMIN"));

        return Map.of(
                "username", principal.getName(),
                "showStudentLink", isStudent,
                "showSupervisorLink", isSupervisor,
                "showAdminLink", isAdmin
        );
    }
}