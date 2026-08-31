package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.StudentDto;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.demo.auth.Role;

/**
 * M3 (MIGRATION_PLAN.md): student API rebound to the Model-B students table.
 */
@RestController
@RequestMapping("/api/students")
public class StudentController {

    private static final long DEFAULT_UNIVERSITY_ID = 19L; // Nkumba (single-university deployment)

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final AuditLogService auditLogService;
    private final UniversityRepository universityRepository;
    private final PasswordEncoder passwordEncoder;

    public StudentController(StudentRepository studentRepository,
            UserRepository userRepository,
            DayDiaryRepository dayDiaryRepository,
            AuditLogService auditLogService,
            UniversityRepository universityRepository,
            PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.auditLogService = auditLogService;
        this.universityRepository = universityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<StudentDto> getMyProfile(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/progress")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMyProgress(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        // M4: diaries rekeyed to students.id.
        long diaryCount = dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId()).size();
        boolean started = student.getInternshipCompanyId() != null;
        return ResponseEntity.ok(new java.util.HashMap<>() {{
            put("startDate", started);
            put("diaryCount", diaryCount);
            put("midTerm", diaryCount >= 5);
            put("finalReport", diaryCount >= 10);
        }});
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentDto> updateMyProfile(@RequestBody StudentDto dto, Principal principal) {
        Student student = currentStudent(principal);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        merge(dto, student, false);
        return ResponseEntity.ok(toDto(studentRepository.save(student)));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentDto> getAllStudents() {
        return studentRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/university")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getUniversityStudents(Principal principal) {
        Long universityId = resolveUniversityId(principal);
        if (universityId == null) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "Your account is not linked to a university."));
        }
        List<StudentDto> students = studentRepository.findByUniversityId(universityId)
                .stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(students);
    }

    @GetMapping("/university/profile")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getUniversityProfile(Principal principal) {
        Long universityId = resolveUniversityId(principal);
        if (universityId == null) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "Your account is not linked to a university."));
        }
        return universityRepository.findById(universityId.intValue())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<?> createStudent(@RequestBody StudentDto dto, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        Long companyId = null;
        if (loggedInUser != null && loggedInUser.getRole() == Role.COMPANY) {
            companyId = loggedInUser.getCompanyId();
            dto.setInternshipCompanyId(companyId);
        }

        UserEntity user = resolveLinkedUser(dto);
        if (user == null) {
            String username = dto.getUsername() != null ? dto.getUsername().trim() : "";
            if (username.isEmpty() && dto.getStudentNumber() != null) {
                username = dto.getStudentNumber().trim();
            }
            if (username.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        java.util.Map.of("error", "username or student number is required to create student account"));
            }
            if (userRepository.findByUsername(username).isPresent()) {
                user = userRepository.findByUsername(username).get();
            } else {
                user = new UserEntity(username, passwordEncoder.encode(username + "123"), Role.STUDENT);
                user = userRepository.save(user);
            }
        }

        if (studentRepository.findByUserId(user.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("error", "A student record already exists for this account."));
        }
        Student student = new Student();
        applyDto(dto, student, true);
        student.setUserId(user.getId());
        student.setStudentNumber(dto.getStudentNumber() != null ? dto.getStudentNumber() : user.getUsername());
        student.setRegistrationNumber(dto.getRegistrationNumber() != null ? dto.getRegistrationNumber() : "Pending");
        student.setDegreeProgram(dto.getDegreeProgram() != null ? dto.getDegreeProgram() : "Undeclared");
        if (student.getUniversityId() == null) {
            student.setUniversityId(DEFAULT_UNIVERSITY_ID);
        }
        if (companyId != null) {
            student.setInternshipCompanyId(companyId);
        }
        Student saved = studentRepository.save(student);
        auditLogService.log(principal.getName(), loggedInUser != null ? loggedInUser.getRole().name() : "SYSTEM", "CREATE", "Student",
                "Created student: " + saved.getFirstName() + " " + saved.getLastName(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<String> exportStudentsCsv() {
        String csv = studentRepository.findAll().stream()
                .map(s -> String.join(",",
                        escape(s.getId()),
                        escape(s.getFirstName() + " " + s.getLastName()),
                        escape(s.getStudentNumber()),
                        escape(s.getRegistrationNumber()),
                        escape(s.getPhoneNumber()),
                        escape(s.getDegreeProgram()),
                        escape(s.getInternshipCompanyId()),
                        escape(s.getUniSupervisorId()),
                        escape(s.getIndSupervisorId()),
                        escape(s.getStartDate()),
                        escape(s.getEndDate())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,FullName,StudentNumber,RegistrationNumber,Phone,DegreeProgram,"
                + "InternshipCompanyId,UniSupervisorId,IndSupervisorId,StartDate,EndDate\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students.csv\"")
                .body(body);
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentDto> getStudentsByCompany(@PathVariable Long companyId) {
        // M3: exact FK lookup replaces the old substring matcher.
        return studentRepository.findByInternshipCompanyId(companyId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentDto> searchStudents(@RequestParam String q) {
        return studentRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY', 'STUDENT')")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable Long id) {
        return studentRepository.findById(id)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<StudentDto> updateStudent(@PathVariable Long id,
            @RequestBody StudentDto dto, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        return studentRepository.findById(id)
                .map(existing -> {
                    if (loggedInUser != null && loggedInUser.getRole() == Role.COMPANY) {
                        if (!loggedInUser.getCompanyId().equals(existing.getInternshipCompanyId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).<StudentDto>build();
                        }
                        dto.setInternshipCompanyId(loggedInUser.getCompanyId());
                    }
                    merge(dto, existing, true);
                    Student saved = studentRepository.save(existing);
                    auditLogService.log(principal.getName(), loggedInUser != null ? loggedInUser.getRole().name() : "SYSTEM", "UPDATE", "Student",
                            "Updated student: " + saved.getFirstName() + " " + saved.getLastName(), null);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id, Principal principal) {
        UserEntity loggedInUser = userRepository.findByUsername(principal.getName()).orElse(null);
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        if (loggedInUser != null && loggedInUser.getRole() == Role.COMPANY) {
            if (!loggedInUser.getCompanyId().equals(student.getInternshipCompanyId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        String name = student.getFirstName() + " " + student.getLastName();
        dayDiaryRepository.deleteAll(dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId()));
        studentRepository.deleteById(id);
        auditLogService.log(principal.getName(), loggedInUser != null ? loggedInUser.getRole().name() : "SYSTEM", "DELETE", "Student",
                "Deleted student: " + name, null);
        return ResponseEntity.noContent().build();
    }

    private Student currentStudent(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .orElse(null);
    }

    private Long resolveUniversityId(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .map(UserEntity::getUniversityId)
                .orElse(null);
    }

    private UserEntity resolveLinkedUser(StudentDto dto) {
        if (dto.getUserId() != null) {
            return userRepository.findById(dto.getUserId()).orElse(null);
        }
        if (dto.getUsername() != null && !dto.getUsername().isBlank()) {
            return userRepository.findByUsername(dto.getUsername().trim()).orElse(null);
        }
        return null;
    }

    private void applyDto(StudentDto dto, Student student, boolean create) {
        if (dto.getUniversityId() != null) {
            student.setUniversityId(dto.getUniversityId());
        }
        if (dto.getInternshipCompanyId() != null || create) {
            student.setInternshipCompanyId(dto.getInternshipCompanyId());
        }
        if (dto.getUniSupervisorId() != null || create) {
            student.setUniSupervisorId(dto.getUniSupervisorId());
        }
        if (dto.getIndSupervisorId() != null || create) {
            student.setIndSupervisorId(dto.getIndSupervisorId());
        }
        if (dto.getFirstName() != null) {
            student.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null) {
            student.setLastName(dto.getLastName());
        }
        if (create && dto.getFirstName() == null) {
            student.setFirstName("New");
        }
        if (create && dto.getLastName() == null) {
            student.setLastName("Student");
        }
        if (dto.getRegistrationNumber() != null) {
            student.setRegistrationNumber(dto.getRegistrationNumber());
        }
        if (dto.getStudentNumber() != null) {
            student.setStudentNumber(dto.getStudentNumber());
        }
        if (dto.getDegreeProgram() != null) {
            student.setDegreeProgram(dto.getDegreeProgram());
        }
        if (dto.getYearOfStudy() != null || create) {
            student.setYearOfStudy(dto.getYearOfStudy());
        }
        if (dto.getPhoneNumber() != null || create) {
            student.setPhoneNumber(dto.getPhoneNumber());
        }
        if (dto.getIntake() != null || create) {
            student.setIntake(dto.getIntake());
        }
        if (dto.getGender() != null || create) {
            student.setGender(dto.getGender());
        }
        if (dto.getAcademicYear() != null || create) {
            student.setAcademicYear(dto.getAcademicYear());
        }
        if (dto.getSemester() != null || create) {
            student.setSemester(dto.getSemester());
        }
        if (dto.getStartDate() != null || create) {
            student.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null || create) {
            student.setEndDate(dto.getEndDate());
        }
        if (dto.getSchoolId() != null || create) {
            student.setSchoolId(dto.getSchoolId());
        }
        if (dto.getDepartmentId() != null || create) {
            student.setDepartmentId(dto.getDepartmentId());
        }
        if (dto.getProgrammeId() != null || create) {
            student.setProgrammeId(dto.getProgrammeId());
        }
    }

    private void merge(StudentDto dto, Student student, boolean adminUpdate) {
        applyDto(dto, student, false);
        if (adminUpdate && dto.getStudentNumber() != null) {
            student.setStudentNumber(dto.getStudentNumber());
        }
    }

    private StudentDto toDto(Student student) {
        StudentDto dto = new StudentDto();
        dto.setId(student.getId());
        dto.setUserId(student.getUserId());
        dto.setUniversityId(student.getUniversityId());
        dto.setInternshipCompanyId(student.getInternshipCompanyId());
        dto.setUniSupervisorId(student.getUniSupervisorId());
        dto.setIndSupervisorId(student.getIndSupervisorId());
        dto.setFirstName(student.getFirstName());
        dto.setLastName(student.getLastName());
        dto.setRegistrationNumber(student.getRegistrationNumber());
        dto.setStudentNumber(student.getStudentNumber());
        dto.setDegreeProgram(student.getDegreeProgram());
        dto.setYearOfStudy(student.getYearOfStudy());
        dto.setPhoneNumber(student.getPhoneNumber());
        dto.setGender(student.getGender());
        dto.setIntake(student.getIntake());
        dto.setAcademicYear(student.getAcademicYear());
        dto.setSemester(student.getSemester());
        dto.setStartDate(student.getStartDate());
        dto.setEndDate(student.getEndDate());
        dto.setSchoolId(student.getSchoolId());
        dto.setDepartmentId(student.getDepartmentId());
        dto.setProgrammeId(student.getProgrammeId());
        userRepository.findById(student.getUserId())
                .ifPresent(u -> dto.setUsername(u.getUsername()));
        return dto;
    }

    private String escape(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
