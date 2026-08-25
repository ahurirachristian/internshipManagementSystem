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

/**
 * M3 (MIGRATION_PLAN.md): student API rebound to the Model-B students table.
 * Transitional: /me/progress still counts diaries via the Model-A link until
 * M4 rekeys day_diaries.
 */
@RestController
@RequestMapping("/api/students")
public class StudentController {

    private static final long DEFAULT_UNIVERSITY_ID = 19L; // Nkumba (single-university deployment)

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final AuditLogService auditLogService;

    public StudentController(StudentRepository studentRepository,
            UserRepository userRepository,
            DayDiaryRepository dayDiaryRepository,
            AuditLogService auditLogService) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.auditLogService = auditLogService;
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
        // Transitional diary count via Model-A profile link until M4.
        long diaryCount = dayDiaryRepository
                .findByStudentProfileStudentNoOrderByDateDesc(principal.getName())
                .size();
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

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> createStudent(@RequestBody StudentDto dto, Principal principal) {
        UserEntity user = resolveLinkedUser(dto);
        if (user == null) {
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "username or userId of an existing account is required"));
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
        Student saved = studentRepository.save(student);
        auditLogService.log(principal.getName(), "SUPERVISOR", "CREATE", "Student",
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
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<StudentDto> updateStudent(@PathVariable Long id,
            @RequestBody StudentDto dto, Principal principal) {
        return studentRepository.findById(id)
                .map(existing -> {
                    merge(dto, existing, true);
                    Student saved = studentRepository.save(existing);
                    auditLogService.log(principal.getName(), "SUPERVISOR", "UPDATE", "Student",
                            "Updated student: " + saved.getFirstName() + " " + saved.getLastName(), null);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id, Principal principal) {
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        String name = student.getFirstName() + " " + student.getLastName();
        // M4 will cascade-delete rekeyed diaries here.
        studentRepository.deleteById(id);
        auditLogService.log(principal.getName(), "SUPERVISOR", "DELETE", "Student",
                "Deleted student: " + name, null);
        return ResponseEntity.noContent().build();
    }

    private Student currentStudent(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
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
        dto.setIntake(student.getIntake());
        dto.setAcademicYear(student.getAcademicYear());
        dto.setSemester(student.getSemester());
        dto.setStartDate(student.getStartDate());
        dto.setEndDate(student.getEndDate());
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
