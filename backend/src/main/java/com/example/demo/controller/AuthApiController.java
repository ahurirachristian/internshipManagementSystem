package com.example.demo.controller;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.PasswordResetService;
import com.example.demo.auth.RateLimiter;
import com.example.demo.auth.SessionFreshnessFilter;
import com.example.demo.email.EmailSender;
import com.example.demo.email.EmailTemplates;
import com.example.demo.notification.NotificationService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

@RestController
@RequestMapping("/api")
public class AuthApiController {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /**
     * L2: a duplicate email must not confirm that the address exists, so the
     * duplicate path returns the very same generic message as a malformed one.
     */
    private static final String INVALID_EMAIL = "Please enter a valid email address.";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final StudentRepository studentRepository;
    private final CompanyRepository companyRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final UniversityRepository universityRepository;
    private final NotificationService notificationService;
    private final PasswordResetService passwordResetService;
    private final EmailSender emailSender;
    private final EmailTemplates emailTemplates;
    private final RateLimiter rateLimiter;

    public AuthApiController(AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            StudentRepository studentRepository,
            CompanyRepository companyRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            UniversityRepository universityRepository,
            NotificationService notificationService,
            PasswordResetService passwordResetService,
            EmailSender emailSender,
            EmailTemplates emailTemplates,
            RateLimiter rateLimiter) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.studentRepository = studentRepository;
        this.companyRepository = companyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.universityRepository = universityRepository;
        this.notificationService = notificationService;
        this.passwordResetService = passwordResetService;
        this.emailSender = emailSender;
        this.emailTemplates = emailTemplates;
        this.rateLimiter = rateLimiter;
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
                    result.put("email", user.getEmail());
                    result.put("mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword()));
                    result.put("superAdmin", Boolean.TRUE.equals(user.getSuperAdmin()));
                    return result;
                })
                .orElseGet(() -> Map.<String, Object>of("username", principal.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody Map<String, String> body, Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .map(user -> {
                    String email = body.getOrDefault("email", "").trim();
                    if (!email.isBlank()) {
                        if (!EMAIL.matcher(email).matches()) {
                            return ResponseEntity.badRequest().body(Map.of("error", INVALID_EMAIL));
                        }
                        if (userRepository.findByEmail(email)
                                .filter(other -> !other.getId().equals(user.getId())).isPresent()) {
                            return ResponseEntity.badRequest().body(Map.of("error", INVALID_EMAIL));
                        }
                        user.setEmail(email);
                        userRepository.save(user);
                        auditLogService.log(principal.getName(), user.getRole().name(), "UPDATE", "User",
                                "Account email updated", null);
                    }
                    Map<String, Object> result = new HashMap<>();
                    result.put("username", user.getUsername());
                    result.put("email", user.getEmail());
                    result.put("role", user.getRole().name());
                    return ResponseEntity.ok(result);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found.")));
    }

    @GetMapping("/roles")
    public List<String> getRoles() {
        return Arrays.stream(Role.values()).map(Role::name).toList();
    }

    /** P1 (R5): public slim list so anonymous registration can pick a university. */
    @GetMapping("/universities/options")
    public List<Map<String, Object>> universityOptions() {
        return universityRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(University::getFullName,
                        java.util.Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(u -> Map.<String, Object>of(
                        "id", u.getUniversityId(),
                        "shortForm", u.getShortForm() == null ? "" : u.getShortForm(),
                        "fullName", u.getFullName() == null ? "" : u.getFullName()))
                .toList();
    }

    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String username, @RequestParam String password,
            HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        Optional<UserEntity> maybeUser = userRepository.findByUsername(username);

        // L20: locked accounts are rejected before any credential check (no oracle).
        if (maybeUser.isPresent()) {
            UserEntity candidate = maybeUser.get();
            if (candidate.getLockedUntil() != null && candidate.getLockedUntil().isAfter(LocalDateTime.now())) {
                return lockedResponse(candidate);
            }
            if (candidate.getLockedUntil() != null) {
                // Lazy auto-unlock: the window has passed.
                candidate.setLockedUntil(null);
                candidate.setFailedLoginAttempts(0);
                userRepository.save(candidate);
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));
            request.getSession(true);
            SecurityContext context = SecurityContextHolder.getContext();
            context.setAuthentication(authentication);
            request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
            // L12: stamp the session so a later password change can revoke it.
            request.getSession(true).setAttribute(SessionFreshnessFilter.LOGIN_TIME_ATTRIBUTE, System.currentTimeMillis());

            // R2: the role is resolved server-side from the account, never from the client.
            UserEntity user = maybeUser.orElseThrow();
            if (user.getFailedLoginAttempts() != 0 || user.getLockedUntil() != null) {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
            }
            String actualRole = user.getRole().name();

            String path = resolveHome(actualRole);
            String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();

            auditLogService.log(username, actualRole, "LOGIN", "User", "User logged in successfully", ip);
            return ResponseEntity.ok(Map.of(
                    "username", username,
                    "role", actualRole,
                    "redirect", baseUrl + path,
                    "mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword())));
        } catch (AuthenticationException ex) {
            if (maybeUser.isPresent()) {
                UserEntity user = maybeUser.get();
                int attempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(attempts);
                if (attempts >= MAX_FAILED_LOGINS) {
                    user.setLockedUntil(LocalDateTime.now().plus(LOCKOUT_DURATION));
                    userRepository.save(user);
                    auditLogService.log(username, user.getRole().name(), "ACCOUNT_LOCKED", "User",
                            "Account locked after " + attempts + " failed sign-ins", ip);
                    sendLockEmail(user);
                    return lockedResponse(user);
                }
                userRepository.save(user);
            }
            // Unknown usernames get no per-account lock (enumeration-safe); per-IP
            // throttling is applied by the limiter for brute-force visibility.
            rateLimiter.tryAcquire("login-fail-ip:" + ip, 50, LOCKOUT_DURATION);
            auditLogService.log(username, "UNKNOWN", "LOGIN_FAILED", "User", "Failed sign-in attempt", ip);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }
    }

    private ResponseEntity<Map<String, Object>> lockedResponse(UserEntity user) {
        long minutes = Math.max(1, (Duration.between(LocalDateTime.now(), user.getLockedUntil()).getSeconds() + 59) / 60);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "ACCOUNT_LOCKED", "minutesRemaining", minutes));
    }

    private void sendLockEmail(UserEntity user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        try {
            String unlockTime = user.getLockedUntil().toLocalTime()
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
            emailSender.send(user.getEmail(), "Your IMS account was locked",
                    emailTemplates.accountLocked(user.getUsername(), unlockTime));
        } catch (RuntimeException ex) {
            // §8.3: email failures never block the flow.
        }
    }

    /** P2 (R14 helper): lets a user set their own password; used by the first-login gate in P4. */
    @PostMapping("/me/password")
    public ResponseEntity<?> changeMyPassword(@RequestBody Map<String, String> body, Principal principal) {
        String currentPassword = body.getOrDefault("currentPassword", "");
        String newPassword = body.getOrDefault("newPassword", "");
        if (currentPassword.isEmpty() || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }
        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters."));
        }
        UserEntity user = userRepository.findByUsername(principal.getName()).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect."));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        auditLogService.log(user.getUsername(), user.getRole().name(), "PASSWORD_CHANGE", "User",
                "Password changed by the account owner", null);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String email = body.getOrDefault("email", "").trim();
        // D2: passwords are never trimmed — login, register and reset stay consistent.
        String password = body.getOrDefault("password", "");
        String confirmPassword = body.getOrDefault("confirmPassword", "");

        if (username.isEmpty() || email.isEmpty() || password.isEmpty() || confirmPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }

        if (!password.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match."));
        }

        if (!EMAIL.matcher(email).matches() || userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", INVALID_EMAIL));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists."));
        }

        // R3/L3: the incoming role is ignored — registration always creates a STUDENT.
        Long universityId = resolveUniversityId(body.get("universityId"));

        UserEntity user = new UserEntity(username, passwordEncoder.encode(password), Role.STUDENT);
        user.setEmail(email);
        user.setUniversityId(universityId);
        // The registrant chose their own password, so no forced change (R14 applies
        // to org-issued credentials only).
        user.setMustChangePassword(false);
        userRepository.save(user);

        createStudentRecord(user, body, universityId);

        if (universityId == null) {
            // L13: unlisted university ⇒ the account holds only STUDENT and admins
            // are asked to link it manually.
            List<Long> adminIds = userRepository.findByRole(Role.ADMIN).stream()
                    .map(UserEntity::getId).toList();
            notificationService.notify(adminIds, "REGISTRATION_UNLISTED_UNIVERSITY",
                    "New student needs a university",
                    "Student " + username + " registered without a listed university.",
                    "/admin/users");
        }

        auditLogService.log(username, Role.STUDENT.name(), "REGISTER", "User",
                "New student account created", null);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Account created successfully."));
    }

    /**
     * M3 (MIGRATION_PLAN.md): every registration creates a linked Model-B
     * students row. P1: the university comes from the (validated) request; an
     * absent or unknown university is stored as NULL and escalated to admins.
     */
    private void createStudentRecord(UserEntity user, Map<String, String> body, Long universityId) {
        Student student = new Student();
        student.setUserId(user.getId());
        student.setUniversityId(universityId);
        String fullName = body.getOrDefault("fullName", "").trim();
        String firstName = body.getOrDefault("firstName", "").trim();
        String lastName = body.getOrDefault("lastName", "").trim();
        if (firstName.isEmpty() && lastName.isEmpty() && !fullName.isEmpty()) {
            int space = fullName.indexOf(' ');
            firstName = space > 0 ? fullName.substring(0, space) : fullName;
            lastName = space > 0 ? fullName.substring(space + 1).trim() : "";
        }
        student.setFirstName(firstName.isEmpty() ? "New" : firstName);
        student.setLastName(lastName.isEmpty() ? "Student" : lastName);
        student.setStudentNumber(body.getOrDefault("studentNumber", user.getUsername()).trim());
        student.setRegistrationNumber(body.getOrDefault("registrationNumber", "Pending").trim());
        student.setDegreeProgram(body.getOrDefault("degreeProgram", "Undeclared").trim());
        student.setYearOfStudy(parseIntOrNull(body.get("yearOfStudy")));
        student.setPhoneNumber(body.getOrDefault("phoneNumber", null));
        student.setIntake(body.getOrDefault("intake", null));
        student.setAcademicYear(body.getOrDefault("academicYear", null));
        student.setSemester(body.getOrDefault("semester", null));
        student.setStartDate(parseDateOrNull(body.get("startDate")));
        student.setEndDate(parseDateOrNull(body.get("endDate")));

        // Resolve company
        String companyName = body.get("internshipCompany");
        if (companyName != null && !companyName.isBlank()) {
            companyName = companyName.trim();
            final String finalCompanyName = companyName;
            Long companyId = companyRepository.findAll().stream()
                    .filter(c -> c.getName().equalsIgnoreCase(finalCompanyName))
                    .map(Company::getId)
                    .findFirst()
                    .orElseGet(() -> {
                        Company newComp = new Company();
                        newComp.setName(finalCompanyName);
                        newComp.setSize(Company.Size.Medium);
                        newComp.setIndustry("Technology");
                        newComp.setEmail("info@" + finalCompanyName.toLowerCase().replaceAll("[^a-z0-9]", "") + ".com");
                        newComp.setPhone("Pending");
                        newComp.setCountry("Uganda");
                        newComp.setCity("Kampala");
                        newComp.setPhysicalAddress("Pending");
                        return companyRepository.save(newComp).getId();
                    });
            student.setInternshipCompanyId(companyId);
        }

        // Resolve university supervisor
        String supervisorUsername = body.get("universitySupervisor");
        if (supervisorUsername != null && !supervisorUsername.isBlank()) {
            supervisorUsername = supervisorUsername.trim();
            final String finalSupervisorUsername = supervisorUsername;
            userRepository.findByUsername(finalSupervisorUsername)
                    .flatMap(u -> universitySupervisorRepository.findByUserId(u.getId()))
                    .ifPresent(sup -> student.setUniSupervisorId(sup.getId()));
        }

        studentRepository.save(student);
    }

    /** Returns the university id only when it exists in the catalog; otherwise NULL (L13). */
    private Long resolveUniversityId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        long id;
        try {
            id = Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
        return universityRepository.findById((int) id).map(u -> Long.valueOf(id)).orElse(null);
    }

    private Integer parseIntOrNull(String value) {
        try {
            return value != null && !value.isBlank() ? Integer.parseInt(value.trim()) : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private java.time.LocalDate parseDateOrNull(String value) {
        try {
            return value != null && !value.isBlank() ? java.time.LocalDate.parse(value.trim()) : null;
        } catch (java.time.format.DateTimeParseException ex) {
            return null;
        }
    }

    /** P2 (R1/L1/L2): email-only request; always answers generically. */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = body.getOrDefault("email", "").trim();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Enter your email address."));
        }
        if (!passwordResetService.requestReset(email, request.getRemoteAddr())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many requests. Please try again later."));
        }
        return ResponseEntity.ok(Map.of("message", PasswordResetService.GENERIC_MESSAGE));
    }

    /** P2 (R1): consumes the single-use token emailed by forgot-password. */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.getOrDefault("token", "");
        String password = body.getOrDefault("password", "");
        String confirmPassword = body.getOrDefault("confirmPassword", "");
        if (token.isBlank() || password.isEmpty() || confirmPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }
        if (!password.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match."));
        }
        if (!passwordResetService.resetPassword(token, password)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", PasswordResetService.INVALID_TOKEN_MESSAGE));
        }
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
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
