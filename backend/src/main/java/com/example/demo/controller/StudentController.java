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
import com.example.demo.company.InternshipCompany;
import com.example.demo.company.InternshipCompanyRepository;
import com.example.demo.department.Department;
import com.example.demo.department.DepartmentRepository;
import com.example.demo.dto.CompanyDetailsDto;
import com.example.demo.dto.IndustrialSupervisorDto;
import com.example.demo.dto.LearningInstituteDto;
import com.example.demo.dto.StudentDto;
import com.example.demo.dto.StudentSettingsDto;
import com.example.demo.dto.UniversitySupervisorDto;
import com.example.demo.programme.Programme;
import com.example.demo.programme.ProgrammeRepository;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.student.StudentSetting;
import com.example.demo.student.StudentSettingRepository;
import com.example.demo.supervisor.IndustrialSupervisor;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

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
    private final DepartmentRepository departmentRepository;
    private final ProgrammeRepository programmeRepository;
    private final InternshipCompanyRepository internshipCompanyRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final StudentSettingRepository studentSettingRepository;
    private final com.example.demo.auth.AuthorizationScopeService scopeService;

    public StudentController(StudentRepository studentRepository,
            UserRepository userRepository,
            DayDiaryRepository dayDiaryRepository,
            AuditLogService auditLogService,
            UniversityRepository universityRepository,
            DepartmentRepository departmentRepository,
            ProgrammeRepository programmeRepository,
            InternshipCompanyRepository internshipCompanyRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            StudentSettingRepository studentSettingRepository,
            com.example.demo.auth.AuthorizationScopeService scopeService) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.auditLogService = auditLogService;
        this.universityRepository = universityRepository;
        this.departmentRepository = departmentRepository;
        this.programmeRepository = programmeRepository;
        this.internshipCompanyRepository = internshipCompanyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.studentSettingRepository = studentSettingRepository;
        this.scopeService = scopeService;
    }

    // PC7: the /me family is student self-service. An INDUSTRIAL_SUPERVISOR has
    // no student row, so it stays closed to them (they would 404 anyway).
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
    // PC7: /me family — student self-service (see getMyProfile).
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

    @GetMapping("/me/learning-institute")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMyLearningInstitute(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getUniversityId() == null) {
            return ResponseEntity.notFound().build();
        }
        return universityRepository.findById(student.getUniversityId().intValue())
                .map(u -> {
                    LearningInstituteDto dto = new LearningInstituteDto();
                    dto.setId(u.getId());
                    dto.setName(u.getShortForm() != null ? u.getShortForm() : u.getFullName());
                    dto.setShortForm(u.getShortForm());
                    dto.setFullName(u.getFullName());
                    dto.setEmail(u.getEmail());
                    dto.setPhone(u.getPhone());
                    dto.setAddress(u.getPhysicalAddress());
                    dto.setWebsite(u.getWebsite());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/company")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMyCompany(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getInternshipCompanyId() == null) {
            return ResponseEntity.notFound().build();
        }
        return internshipCompanyRepository.findById(student.getInternshipCompanyId())
                .map(c -> {
                    CompanyDetailsDto dto = new CompanyDetailsDto();
                    dto.setId(c.getId());
                    dto.setCompanyName(c.getCompanyName());
                    dto.setBranch(c.getBranch());
                    dto.setPhysicalAddress(c.getPhysicalAddress());
                    dto.setWebsite(c.getWebsite());
                    dto.setEmail(c.getEmail());
                    // Chris leaves these two null; the tab would render them as em-dashes.
                    dto.setPhone(c.getPhone());
                    dto.setContactPerson(c.getContactPerson());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/industrial-supervisor")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMyIndustrialSupervisor(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getIndSupervisorId() == null) {
            return ResponseEntity.notFound().build();
        }
        return industrialSupervisorRepository.findById(student.getIndSupervisorId())
                .map(s -> {
                    IndustrialSupervisorDto dto = new IndustrialSupervisorDto();
                    dto.setId(s.getId());
                    dto.setFirstName(s.getFirstName());
                    dto.setLastName(s.getLastName());
                    dto.setPhoneNumber(s.getPhoneNumber());
                    dto.setDepartment(s.getDepartment());
                    userRepository.findById(s.getUserId()).ifPresent(u -> dto.setEmail(u.getEmail()));
                    if (s.getCompanyId() != null) {
                        internshipCompanyRepository.findById(s.getCompanyId())
                                .ifPresent(c -> dto.setCompanyName(c.getCompanyName()));
                    }
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/university-supervisor")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMyUniversitySupervisor(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getUniSupervisorId() == null) {
            return ResponseEntity.notFound().build();
        }
        return universitySupervisorRepository.findById(student.getUniSupervisorId())
                .map(s -> {
                    UniversitySupervisorDto dto = new UniversitySupervisorDto();
                    dto.setId(s.getId());
                    dto.setFirstName(s.getFirstName());
                    dto.setLastName(s.getLastName());
                    dto.setPhoneNumber(s.getPhoneNumber());
                    dto.setDepartment(s.getDepartment());
                    userRepository.findById(s.getUserId()).ifPresent(u -> dto.setEmail(u.getEmail()));
                    // Chris dereferences getUniversityId() unguarded; null-safe here.
                    if (s.getUniversityId() != null) {
                        universityRepository.findById(s.getUniversityId().intValue())
                                .ifPresent(u -> dto.setUniversityName(u.getFullName()));
                    }
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/settings")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> getMySettings(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        StudentSetting setting = studentSettingRepository.findByStudentId(student.getUserId());
        if (setting == null) {
            setting = new StudentSetting();
            setting.setStudentId(student.getUserId());
            setting.setEmailNotifications(Boolean.TRUE);
            setting.setSmsNotifications(Boolean.TRUE);
            setting.setDarkMode(Boolean.FALSE);
            setting.setLanguage("en");
            setting = studentSettingRepository.save(setting);
        }
        StudentSettingsDto dto = new StudentSettingsDto();
        dto.setId(setting.getId());
        dto.setEmailNotifications(setting.getEmailNotifications());
        dto.setSmsNotifications(setting.getSmsNotifications());
        dto.setDarkMode(setting.getDarkMode());
        dto.setLanguage(setting.getLanguage());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/me/settings")
    // PC7: /me family — student self-service (see getMyProfile).
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<?> updateMySettings(@RequestBody StudentSettingsDto dto, Principal principal) {
        Student student = currentStudent(principal);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        StudentSetting setting = studentSettingRepository.findByStudentId(student.getUserId());
        if (setting == null) {
            setting = new StudentSetting();
            setting.setStudentId(student.getUserId());
        }
        setting.setEmailNotifications(dto.getEmailNotifications() != null ? dto.getEmailNotifications() : setting.getEmailNotifications());
        setting.setSmsNotifications(dto.getSmsNotifications() != null ? dto.getSmsNotifications() : setting.getSmsNotifications());
        setting.setDarkMode(dto.getDarkMode() != null ? dto.getDarkMode() : setting.getDarkMode());
        setting.setLanguage(dto.getLanguage() != null ? dto.getLanguage() : setting.getLanguage());
        StudentSetting saved = studentSettingRepository.save(setting);
        StudentSettingsDto result = new StudentSettingsDto();
        result.setId(saved.getId());
        result.setEmailNotifications(saved.getEmailNotifications());
        result.setSmsNotifications(saved.getSmsNotifications());
        result.setDarkMode(saved.getDarkMode());
        result.setLanguage(saved.getLanguage());
        return ResponseEntity.ok(result);
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
    // PC7: full-roster reads stay a university/admin capability; field
    // supervisors see their company's interns through /company/{companyId}.
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentDto> getAllStudents() {
        return studentRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/university")
    // PC7: university-scoped reads stay a university persona.
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
    // PC7: university-scoped reads stay a university persona.
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
    // PC7: student CRUD stays a university persona; P5 scoping already bounds it.
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
    // PC7: bulk export stays a university/admin capability (L21 data mass).
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
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'INDUSTRIAL_SUPERVISOR', 'COMPANY')")
    public List<StudentDto> getStudentsByCompany(@PathVariable Long companyId, Principal principal) {
        // PC7.7: previously any COMPANY user could pass any companyId and read
        // another company's roster. Non-admins are now scoped to their own
        // company; university supervisors keep university scope semantics.
        UserEntity actor = userRepository.findByUsername(principal.getName()).orElseThrow();
        boolean isAdmin = scopeService.isAdminLike(actor);
        if (!isAdmin) {
            Long own = actor.getCompanyId() != null ? actor.getCompanyId() : actor.getUniversityId();
            if (own == null || !own.equals(companyId)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You can only view students of your own company.");
            }
        }
        // M3: exact FK lookup replaces the old substring matcher.
        return studentRepository.findByInternshipCompanyId(companyId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/search")
    // PC7: unscoped name search stays with university/admin/company personas.
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentDto> searchStudents(@RequestParam String q) {
        return studentRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    // PC7: an unscoped single-student read would let a field supervisor probe
    // any id, so they use their scoped /company/{companyId} view instead.
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY', 'STUDENT')")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable Long id) {
        return studentRepository.findById(id)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    // PC7: student CRUD stays a university persona (P5 scoping bounds it).
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
    // PC7: destructive CRUD stays a university persona (L21).
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id, Principal principal) {
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        String name = student.getFirstName() + " " + student.getLastName();
        dayDiaryRepository.deleteAll(dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId()));
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
                .ifPresent(u -> {
                    dto.setUsername(u.getUsername());
                    dto.setEmail(u.getEmail());
                });
        if (student.getUniversityId() != null) {
            universityRepository.findById(student.getUniversityId().intValue())
                    .ifPresent(u -> dto.setUniversityName(u.getShortForm() != null ? u.getShortForm() : u.getFullName()));
        }
        if (student.getDepartmentId() != null) {
            departmentRepository.findById(student.getDepartmentId().intValue())
                    .ifPresent(d -> dto.setDepartmentName(d.getDepartmentName()));
        }
        if (student.getProgrammeId() != null) {
            programmeRepository.findById(student.getProgrammeId().intValue())
                    .ifPresent(p -> dto.setProgrammeName(p.getProgrammeName()));
        }
        if (student.getInternshipCompanyId() != null) {
            internshipCompanyRepository.findById(student.getInternshipCompanyId())
                    .ifPresent(c -> {
                        dto.setCompanyName(c.getCompanyName());
                        dto.setCompanyBranch(c.getBranch());
                        dto.setCompanyAddress(c.getPhysicalAddress());
                        dto.setCompanyWebsite(c.getWebsite());
                    });
        }
        if (student.getUniSupervisorId() != null) {
            universitySupervisorRepository.findById(student.getUniSupervisorId())
                    .ifPresent(s -> {
                        dto.setUniversitySupervisor((s.getFirstName() != null ? s.getFirstName() + " " : "")
                                + (s.getLastName() != null ? s.getLastName() : ""));
                        dto.setUniversitySupervisorPhone(s.getPhoneNumber());
                    });
        }
        if (student.getIndSupervisorId() != null) {
            industrialSupervisorRepository.findById(student.getIndSupervisorId())
                    .ifPresent(s -> {
                        dto.setIndustrialSupervisor((s.getFirstName() != null ? s.getFirstName() + " " : "")
                                + (s.getLastName() != null ? s.getLastName() : ""));
                        dto.setIndustrialSupervisorPhone(s.getPhoneNumber());
                    });
        }
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
