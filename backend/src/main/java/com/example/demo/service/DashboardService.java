package com.example.demo.service;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    public Map<String, Object> getDashboardAttributes(Principal principal, Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ADMIN"));
        boolean isSupervisor = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("SUPERVISOR"));
        boolean isStudent = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("STUDENT"));

        // Admin can access all areas (Supervisor, Student, Company)
        boolean showSupervisorLink = isAdmin || isSupervisor;
        // Supervisor and Admin can access Student area; Students can access their own area
        boolean showStudentLink = isAdmin || isSupervisor || isStudent;
        // Admin and Supervisor can access Company area
        boolean showCompanyLink = isAdmin || isSupervisor;

        return Map.of(
                "username", principal.getName(),
                "showStudentLink", showStudentLink,
                "showSupervisorLink", showSupervisorLink,
                "showCompanyLink", showCompanyLink,
                "showAdminLink", isAdmin
        );
    }
}