package com.example.demo.auth;

import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.university.UniversityRepository;

/**
 * P4 (R6/L6): grant/revoke roles and enable/disable accounts. The authority
 * refresh filter applies the result on the target's very next request (L5).
 */
@Service
public class UserRoleService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UniversityRepository universityRepository;
    private final AuthorizationScopeService scope;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public UserRoleService(UserRepository userRepository, CompanyRepository companyRepository,
            UniversityRepository universityRepository, AuthorizationScopeService scope,
            NotificationService notificationService, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.universityRepository = universityRepository;
        this.scope = scope;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public UserEntity grantRole(UserEntity actor, Long targetId, String roleName, Long universityId,
            String companyName) {
        UserEntity target = userRepository.findById(targetId)
                .orElseThrow(() -> new NoSuchElementException("User not found."));
        scope.requireCanManage(actor, target);

        String role = roleName == null ? "" : roleName.trim().toUpperCase();
        Role parsed;
        try {
            parsed = Role.valueOf(role);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role selected.");
        }

        switch (parsed) {
            case SUPERVISOR -> {
                Long resolved = universityId != null ? universityId : target.getUniversityId();
                if (resolved == null
                        || universityRepository.findById(resolved.intValue()).isEmpty()) {
                    throw new IllegalArgumentException("A university is required to grant the SUPERVISOR role.");
                }
                target.setUniversityId(resolved);
            }
            case COMPANY -> {
                if (companyName == null || companyName.isBlank()) {
                    throw new IllegalArgumentException("A company is required to grant the COMPANY role.");
                }
                target.setCompanyId(resolveOrCreateCompany(companyName.trim()));
            }
            default -> { /* STUDENT / ADMIN need no context */ }
        }
        target.setRole(parsed);
        userRepository.save(target);

        notificationService.notify(List.of(target.getId()), "ROLE_CHANGED",
                "Your role was updated", "You now have the " + role + " role.", homeFor(role));
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "ROLE_GRANTED", "User",
                "Granted " + role + " to " + target.getUsername(), null);
        return target;
    }

    @Transactional
    public UserEntity setEnabled(UserEntity actor, Long targetId, boolean enabled) {
        UserEntity target = userRepository.findById(targetId)
                .orElseThrow(() -> new NoSuchElementException("User not found."));
        scope.requireCanManage(actor, target);
        if (!enabled) {
            scope.requireNotSelf(actor, target);
        }
        target.setEnabled(enabled);
        userRepository.save(target);

        notificationService.notify(List.of(target.getId()),
                enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED",
                enabled ? "Your account was re-enabled" : "Your account was disabled",
                enabled ? "An administrator restored your access."
                        : "An administrator disabled your account. Contact them for details.",
                null);
        auditLogService.log(actor.getUsername(), actor.getRole().name(),
                enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED", "User",
                (enabled ? "Enabled " : "Disabled ") + target.getUsername(), null);
        return target;
    }

    private Long resolveOrCreateCompany(String name) {
        return companyRepository.findAll().stream()
                .filter(c -> c.getName().equalsIgnoreCase(name))
                .map(Company::getId)
                .findFirst()
                .orElseGet(() -> {
                    Company company = new Company();
                    company.setName(name);
                    company.setSize(Company.Size.Medium);
                    company.setIndustry("Unspecified");
                    company.setCountry("Uganda");
                    company.setCity("Kampala");
                    company.setPhysicalAddress("Pending");
                    return companyRepository.save(company).getId();
                });
    }

    private String homeFor(String role) {
        return switch (role) {
            case "ADMIN" -> "/admin/dashboard";
            case "SUPERVISOR" -> "/university/dashboard";
            case "COMPANY" -> "/company/dashboard";
            default -> "/student/dashboard";
        };
    }
}
