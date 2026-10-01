package com.example.demo.company;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.AuthorizationScopeService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.UserDto;
import com.example.demo.email.EmailSender;
import com.example.demo.email.EmailTemplates;
import com.example.demo.notification.NotificationService;
import com.example.demo.role.RoleRequestConflictException;
import com.example.demo.supervisor.IndustrialSupervisor;
import com.example.demo.supervisor.IndustrialSupervisorRepository;

/**
 * P6 (R7/L9): a company manages only the field supervisors of its own
 * company. Since PC7 (D1) field supervisors are INDUSTRIAL_SUPERVISOR users
 * with the company's id set, so they land inside the company's scope, not a
 * university's.
 */
@Service
public class CompanyPeopleService {

    private static final Logger log = LoggerFactory.getLogger(CompanyPeopleService.class);

    private final UserRepository userRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationScopeService scope;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final EmailSender emailSender;
    private final EmailTemplates emailTemplates;

    public CompanyPeopleService(UserRepository userRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            PasswordEncoder passwordEncoder, AuthorizationScopeService scope,
            NotificationService notificationService, AuditLogService auditLogService,
            EmailSender emailSender, EmailTemplates emailTemplates) {
        this.userRepository = userRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.passwordEncoder = passwordEncoder;
        this.scope = scope;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.emailSender = emailSender;
        this.emailTemplates = emailTemplates;
    }

    public List<UserDto> list(UserEntity actor) {
        return userRepository.findByCompanyId(actor.getCompanyId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public UserEntity createFieldSupervisor(UserEntity actor, String firstName, String lastName,
            String email, String phone, String department) {
        Long companyId = actor.getCompanyId();
        if (companyId == null) {
            throw new IllegalArgumentException("Your account is not linked to a company.");
        }
        String first = text(firstName);
        if (first.isEmpty()) {
            throw new IllegalArgumentException("First name is required.");
        }
        String last = text(lastName);
        if (last.isEmpty()) {
            throw new IllegalArgumentException("Last name is required.");
        }
        String emailTrimmed = text(email);
        if (emailTrimmed.isEmpty()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (userRepository.findByEmail(emailTrimmed).isPresent()) {
            throw new RoleRequestConflictException("A user with that email already exists.");
        }

        String username = uniqueUsername(first, last);
        // L16: weak initial credential, forced change at first sign-in.
        String tempPassword = username + "123";
        // PC7 (D1): field supervisors are their own role. Legacy rows created
        // before this change keep the SUPERVISOR role and are surfaced by
        // LegacyFieldSupervisorCheck on boot; they are still manageable here.
        UserEntity user = new UserEntity(username, passwordEncoder.encode(tempPassword), Role.INDUSTRIAL_SUPERVISOR);
        user.setCompanyId(companyId);
        user.setEmail(emailTrimmed);
        user.setMustChangePassword(true);
        userRepository.save(user);

        IndustrialSupervisor supervisor = new IndustrialSupervisor();
        supervisor.setUserId(user.getId());
        supervisor.setCompanyId(companyId);
        supervisor.setFirstName(first);
        supervisor.setLastName(last);
        supervisor.setPhoneNumber(text(phone));
        supervisor.setDepartment(text(department));
        supervisor.setJobTitle("");
        industrialSupervisorRepository.save(supervisor);

        notificationService.notify(List.of(user.getId()), "CREDENTIALS_ISSUED",
                "Your IMS account is ready",
                "Your username is " + username + ". Change your password at first sign-in.",
                "/login");
        sendCredentialsEmail(emailTrimmed, username);
        auditLogService.log(actor.getUsername(), actor.getRole().name(), "FIELD_SUPERVISOR_CREATED",
                "User", "Created field supervisor account " + username, null);
        return user;
    }

    /**
     * PC4: update the editable profile fields of one of the caller's own field
     * supervisors. Names are deliberately not editable here — the login username is
     * derived from them, so changing one without the other would desynchronise the
     * two. Scoped by {@link #requireOwnSupervisor}, so another company's supervisor
     * is out of reach.
     */
    @Transactional
    public UserEntity updateFieldSupervisor(UserEntity actor, Long targetId, String email, String phone,
            String department) {
        UserEntity target = requireOwnSupervisor(actor, targetId);

        String emailTrimmed = text(email);
        if (!emailTrimmed.isEmpty()) {
            Optional<UserEntity> clash = userRepository.findByEmail(emailTrimmed);
            if (clash.isPresent() && !clash.get().getId().equals(target.getId())) {
                throw new RoleRequestConflictException("A user with that email already exists.");
            }
            target.setEmail(emailTrimmed);
            userRepository.save(target);
        }

        industrialSupervisorRepository.findByUserId(targetId).ifPresent(supervisor -> {
            supervisor.setPhoneNumber(text(phone));
            supervisor.setDepartment(text(department));
            industrialSupervisorRepository.save(supervisor);
        });

        auditLogService.log(actor.getUsername(), actor.getRole().name(), "FIELD_SUPERVISOR_UPDATED",
                "User", "Updated field supervisor profile " + target.getUsername(), null);
        return target;
    }

    /** Reset/unlock a supervisor of the caller's own company (L21). */
    public UserEntity requireOwnSupervisor(UserEntity actor, Long targetId) {
        UserEntity target = userRepository.findById(targetId)
                .orElseThrow(() -> new NoSuchElementException("User not found."));
        scope.requireCanManage(actor, target);
        // PC7: accept both the canonical role and the legacy pre-migration shape.
        boolean fieldSupervisor = Role.INDUSTRIAL_SUPERVISOR.equals(target.getRole())
                || (Role.SUPERVISOR.equals(target.getRole()) && target.getCompanyId() != null);
        if (!fieldSupervisor
                || actor.getCompanyId() == null
                || !actor.getCompanyId().equals(target.getCompanyId())) {
            throw new AccessDeniedException("You can only manage your own field supervisors.");
        }
        return target;
    }

    private String uniqueUsername(String first, String last) {
        String base = (first + "." + last).toLowerCase().replaceAll("[^a-z0-9.]", "");
        if (base.isEmpty()) {
            base = "supervisor";
        }
        String candidate = base;
        int suffix = 0;
        while (userRepository.findByUsername(candidate).isPresent()) {
            suffix += 1;
            candidate = base + suffix;
        }
        return candidate;
    }

    private void sendCredentialsEmail(String to, String username) {
        try {
            emailSender.send(to, "Your IMS account is ready", emailTemplates.credentialsIssued(username));
        } catch (RuntimeException ex) {
            log.warn("field supervisor credentials email failed: {}", ex.getMessage());
        }
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private UserDto toDto(UserEntity user) {
        UserDto dto = new UserDto(user.getId(), user.getUsername(), user.getRole().name(),
                user.getEmail(), user.getCompanyId(), user.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(user.getEnabled()));
        dto.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));
        return dto;
    }
}
