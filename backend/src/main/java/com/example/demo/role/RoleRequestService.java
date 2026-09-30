package com.example.demo.role;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.notification.NotificationService;
import com.example.demo.university.UniversityRepository;

/**
 * P3 (R4, L6/L18): a request becomes a row; only a super admin may review it;
 * approval writes the role inside one locked transaction so a double approve is
 * impossible, and both ends are notified.
 */
@Service
public class RoleRequestService {

    private static final Set<String> REQUESTABLE = Set.of("STUDENT", "SUPERVISOR", "ADMIN", "COMPANY");

    private final RoleRequestRepository roleRequestRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UniversityRepository universityRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public RoleRequestService(RoleRequestRepository roleRequestRepository, UserRepository userRepository,
            CompanyRepository companyRepository, UniversityRepository universityRepository,
            NotificationService notificationService, AuditLogService auditLogService) {
        this.roleRequestRepository = roleRequestRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.universityRepository = universityRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public RoleRequest create(UserEntity requester, String requestedRole, Long universityId,
            String companyName, String comment) {
        String role = requestedRole == null ? "" : requestedRole.trim().toUpperCase();
        if (!REQUESTABLE.contains(role)) {
            throw new IllegalArgumentException("Invalid role selected.");
        }
        if (requester.getRole().name().equals(role)) {
            throw new RoleRequestConflictException("You already hold that role.");
        }
        if (roleRequestRepository.existsByUserIdAndRequestedRoleAndStatus(
                requester.getId(), role, RoleRequest.PENDING)) {
            throw new RoleRequestConflictException("You already have a pending request for that role.");
        }

        RoleRequest request = new RoleRequest();
        request.setUserId(requester.getId());
        request.setRequestedRole(role);
        request.setContextUniversityId(universityId);
        request.setContextCompanyName(companyName == null ? null : companyName.trim());
        request.setRequestedAt(LocalDateTime.now());
        roleRequestRepository.save(request);

        List<Long> superAdmins = userRepository.findBySuperAdminTrue().stream()
                .map(UserEntity::getId).toList();
        notificationService.notify(superAdmins, "ROLE_REQUEST",
                "New role request",
                requester.getUsername() + " requested the " + role + " role.",
                "/admin/role-requests");
        auditLogService.log(requester.getUsername(), requester.getRole().name(), "ROLE_REQUEST",
                "RoleRequest", "Requested role " + role, null);
        return request;
    }

    public List<RoleRequest> list(String status) {
        if (status == null || status.isBlank()) {
            return roleRequestRepository.findAll();
        }
        return roleRequestRepository.findByStatusOrderByRequestedAtAsc(status.trim().toUpperCase());
    }

    public List<RoleRequest> mine(Long userId) {
        return roleRequestRepository.findByUserIdOrderByRequestedAtDesc(userId);
    }

    @Transactional
    public RoleRequest approve(Long id, UserEntity reviewer, Long universityId, String companyName) {
        RoleRequest request = roleRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Role request not found."));
        if (!RoleRequest.PENDING.equals(request.getStatus())) {
            throw new RoleRequestConflictException("This request has already been reviewed.");
        }
        UserEntity target = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NoSuchElementException("Requester no longer exists."));

        String role = request.getRequestedRole();
        Long resolvedUniversity = universityId != null ? universityId : request.getContextUniversityId();
        String resolvedCompany = companyName != null && !companyName.isBlank()
                ? companyName.trim()
                : request.getContextCompanyName();

        switch (role) {
            case "SUPERVISOR" -> {
                if (resolvedUniversity == null
                        || universityRepository.findById(resolvedUniversity.intValue()).isEmpty()) {
                    // L13: a supervisor cannot exist without a listed university.
                    throw new IllegalArgumentException("A university is required to grant the SUPERVISOR role.");
                }
                target.setRole(Role.SUPERVISOR);
                target.setUniversityId(resolvedUniversity);
            }
            case "COMPANY" -> {
                if (resolvedCompany == null || resolvedCompany.isBlank()) {
                    throw new IllegalArgumentException("A company is required to grant the COMPANY role.");
                }
                target.setRole(Role.COMPANY);
                target.setCompanyId(resolveOrCreateCompany(resolvedCompany));
            }
            default -> target.setRole(Role.valueOf(role));
        }
        userRepository.save(target);

        request.setStatus(RoleRequest.APPROVED);
        request.setReviewedBy(reviewer.getId());
        request.setReviewedAt(LocalDateTime.now());
        roleRequestRepository.save(request);

        notificationService.notify(List.of(target.getId()), "ROLE_APPROVED",
                "Your role request was approved",
                "You now have the " + role + " role.",
                homeFor(role));
        auditLogService.log(reviewer.getUsername(), reviewer.getRole().name(), "ROLE_APPROVED",
                "RoleRequest", "Approved " + role + " for " + target.getUsername(), null);
        return request;
    }

    @Transactional
    public RoleRequest deny(Long id, UserEntity reviewer, String comment) {
        RoleRequest request = roleRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Role request not found."));
        if (!RoleRequest.PENDING.equals(request.getStatus())) {
            throw new RoleRequestConflictException("This request has already been reviewed.");
        }
        request.setStatus(RoleRequest.DENIED);
        request.setReviewComment(comment);
        request.setReviewedBy(reviewer.getId());
        request.setReviewedAt(LocalDateTime.now());
        roleRequestRepository.save(request);

        String message = comment == null || comment.isBlank()
                ? "Your request for the " + request.getRequestedRole() + " role was declined."
                : "Your request for the " + request.getRequestedRole() + " role was declined: " + comment;
        notificationService.notify(List.of(request.getUserId()), "ROLE_DENIED",
                "Your role request was declined", message, null);
        auditLogService.log(reviewer.getUsername(), reviewer.getRole().name(), "ROLE_DENIED",
                "RoleRequest", "Denied " + request.getRequestedRole(), null);
        return request;
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
