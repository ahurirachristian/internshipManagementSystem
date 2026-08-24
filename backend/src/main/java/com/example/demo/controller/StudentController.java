package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.dto.StudentProfileDto;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.company.CompanyService;
import com.example.demo.audit.AuditLogService;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final CompanyService companyService;
    private final AuditLogService auditLogService;

    public StudentController(StudentProfileRepository studentProfileRepository,
            DayDiaryRepository dayDiaryRepository, CompanyService companyService,
            AuditLogService auditLogService) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.companyService = companyService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> getMyProfile(Principal principal) {
        return studentProfileRepository.findByStudentNo(principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/progress")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMyProgress(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByStudentNo(principal.getName()).orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        long diaryCount = dayDiaryRepository.findByStudentProfileStudentNoOrderByDateDesc(principal.getName()).size();
        Map<String, Object> progress = Map.of(
                "startDate", profile.getOrganisation() != null && !profile.getOrganisation().equals("Pending"),
                "diaryCount", diaryCount,
                "midTerm", diaryCount >= 5,
                "finalReport", diaryCount >= 10
        );
        return ResponseEntity.ok(progress);
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> updateMyProfile(@RequestBody StudentProfileDto dto, Principal principal) {
        StudentProfile existing = studentProfileRepository.findByStudentNo(principal.getName())
                .orElseGet(() -> {
                    StudentProfile blank = new StudentProfile();
                    blank.setStudentNo(principal.getName());
                    blank.setStudentName("Student");
                    blank.setRegNo("Pending");
                    blank.setIntake("Pending");
                    blank.setProgram("Pending");
                    blank.setCourseName("Pending");
                    blank.setEmail(principal.getName());
                    blank.setYearOfStudy("1");
                    blank.setAcademicYear("One");
                    blank.setSemester("One");
                    blank.setOrganisation("Pending");
                    blank.setLocation("Pending");
                    blank.setAcademicSupervisor("Pending");
                    blank.setFieldSupervisor("Pending");
                    return blank;
                });
        merge(existing, dto);
        return ResponseEntity.ok(studentProfileRepository.save(existing));
    }

    private void merge(StudentProfile existing, StudentProfileDto dto) {
        if (dto == null) return;
        if (dto.getStudentName() != null) existing.setStudentName(dto.getStudentName());
        if (dto.getStudentNo() != null) existing.setStudentNo(dto.getStudentNo());
        if (dto.getRegNo() != null) existing.setRegNo(dto.getRegNo());
        if (dto.getIntake() != null) existing.setIntake(dto.getIntake());
        if (dto.getProgram() != null) existing.setProgram(dto.getProgram());
        if (dto.getCourseName() != null) existing.setCourseName(dto.getCourseName());
        if (dto.getMobileNo() != null) existing.setMobileNo(dto.getMobileNo());
        if (dto.getEmail() != null) existing.setEmail(dto.getEmail());
        if (dto.getYearOfStudy() != null) existing.setYearOfStudy(dto.getYearOfStudy());
        if (dto.getAcademicYear() != null) existing.setAcademicYear(dto.getAcademicYear());
        if (dto.getSemester() != null) existing.setSemester(dto.getSemester());
        if (dto.getOrganisation() != null) existing.setOrganisation(dto.getOrganisation());
        if (dto.getLocation() != null) existing.setLocation(dto.getLocation());
        if (dto.getAcademicSupervisor() != null) existing.setAcademicSupervisor(dto.getAcademicSupervisor());
        if (dto.getAcademicSupervisorContact() != null) existing.setAcademicSupervisorContact(dto.getAcademicSupervisorContact());
        if (dto.getFieldSupervisor() != null) existing.setFieldSupervisor(dto.getFieldSupervisor());
        if (dto.getFieldSupervisorContact() != null) existing.setFieldSupervisorContact(dto.getFieldSupervisorContact());
        if (dto.getStartDate() != null) existing.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) existing.setEndDate(dto.getEndDate());
        if (dto.getUnitId() != null) existing.setUnitId(dto.getUnitId());
        if (dto.getCourseId() != null) existing.setCourseId(dto.getCourseId());
        if (dto.getAcademicSupervisorId() != null) existing.setAcademicSupervisorId(dto.getAcademicSupervisorId());
        if (dto.getFieldSupervisorId() != null) existing.setFieldSupervisorId(dto.getFieldSupervisorId());
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> getAllStudents() {
        return studentProfileRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<StudentProfile> createStudent(@RequestBody StudentProfile student, Principal principal) {
        StudentProfile saved = studentProfileRepository.save(student);
        auditLogService.log(principal != null ? principal.getName() : "system", "SUPERVISOR", "CREATE", "StudentProfile", "Created student: " + saved.getStudentName(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<String> exportStudentsCsv() {
        List<StudentProfile> students = studentProfileRepository.findAll();
        String csv = students.stream()
                .map(s -> String.join(",",
                        escape(s.getId()),
                        escape(s.getStudentName()),
                        escape(s.getStudentNo()),
                        escape(s.getRegNo()),
                        escape(s.getEmail()),
                        escape(s.getProgram()),
                        escape(s.getOrganisation()),
                        escape(s.getLocation()),
                        escape(s.getAcademicSupervisor()),
                        escape(s.getFieldSupervisor())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,StudentName,StudentNo,RegNo,Email,Program,Organisation,Location,AcademicSupervisor,FieldSupervisor\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students.csv\"")
                .body(body);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY', 'STUDENT')")
    public ResponseEntity<StudentProfile> getStudentById(@PathVariable Long id) {
        return studentProfileRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> getStudentsByCompany(@PathVariable Long companyId) {
        return companyService.findStudentsByCompanyId(companyId);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> searchStudents(@RequestParam String q) {
        return studentProfileRepository.findByStudentNameContainingIgnoreCase(q);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<StudentProfile> updateStudent(@PathVariable Long id, @RequestBody StudentProfile student, Principal principal) {
        return studentProfileRepository.findById(id)
                .map(existing -> {
                    existing.setStudentName(student.getStudentName());
                    existing.setStudentNo(student.getStudentNo());
                    existing.setRegNo(student.getRegNo());
                    existing.setIntake(student.getIntake());
                    existing.setProgram(student.getProgram());
                    existing.setCourseName(student.getCourseName());
                    existing.setMobileNo(student.getMobileNo());
                    existing.setEmail(student.getEmail());
                    existing.setYearOfStudy(student.getYearOfStudy());
                    existing.setAcademicYear(student.getAcademicYear());
                    existing.setSemester(student.getSemester());
                    existing.setOrganisation(student.getOrganisation());
                    existing.setLocation(student.getLocation());
                    existing.setAcademicSupervisor(student.getAcademicSupervisor());
                    existing.setFieldSupervisor(student.getFieldSupervisor());
                    existing.setStartDate(student.getStartDate());
                    existing.setEndDate(student.getEndDate());
                    existing.setUnitId(student.getUnitId());
                    existing.setCourseId(student.getCourseId());
                    existing.setAcademicSupervisorId(student.getAcademicSupervisorId());
                    existing.setFieldSupervisorId(student.getFieldSupervisorId());
                    StudentProfile saved = studentProfileRepository.save(existing);
                    auditLogService.log(principal.getName(), "ADMIN", "UPDATE", "StudentProfile", "Updated student: " + saved.getStudentName(), null);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id, Principal principal) {
        StudentProfile student = studentProfileRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.notFound().build();
        }
        String studentName = student.getStudentName();
        dayDiaryRepository.findAll().stream()
                .filter(diary -> diary.getStudentProfile() != null
                        && diary.getStudentProfile().getId().equals(id))
                .forEach(dayDiaryRepository::delete);
        studentProfileRepository.deleteById(id);
        auditLogService.log(principal.getName(), "ADMIN", "DELETE", "StudentProfile", "Deleted student: " + studentName, null);
        return ResponseEntity.noContent().build();
    }

    private String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }
}
