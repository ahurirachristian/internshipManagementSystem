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
import com.example.demo.audit.AuditLogService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;

@RestController
@RequestMapping("/api")
public class AuthApiController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final StudentRepository studentRepository;
    private final CompanyRepository companyRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;

    public AuthApiController(AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            StudentRepository studentRepository,
            CompanyRepository companyRepository,
            UniversitySupervisorRepository universitySupervisorRepository) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.studentRepository = studentRepository;
        this.companyRepository = companyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
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

            auditLogService.log(username, actualRole, "LOGIN", "User", "User logged in successfully", request.getRemoteAddr());
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

        if (selectedRole == Role.STUDENT) {
            createStudentRecord(user, body);
        }

        auditLogService.log(username, roleName, "REGISTER", "User", "New account created with role: " + roleName, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Account created successfully."));
    }

    /**
     * M3 (MIGRATION_PLAN.md): every STUDENT registration now creates a
     * Model-B students row linked to the account. Nkumba (19) is the default
     * university in this single-university deployment.
     */
    private void createStudentRecord(UserEntity user, Map<String, String> body) {
        Student student = new Student();
        student.setUserId(user.getId());
        student.setUniversityId(parseLong(body.get("universityId"), 19L));
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

    private Long parseLong(String value, Long fallback) {
        try {
            return value != null && !value.isBlank() ? Long.parseLong(value.trim()) : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
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
                    auditLogService.log(username, user.getRole().name(), "PASSWORD_RESET", "User", "Password reset successfully", null);
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
