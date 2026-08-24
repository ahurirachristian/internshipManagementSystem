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
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public StudentController(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> getMyProfile(Principal principal) {
        return studentProfileRepository.findByUsername(principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/progress")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMyProgress(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        long diaryCount = dayDiaryRepository.findByStudentProfileUsernameOrderByDateDesc(principal.getName()).size();
        Map<String, Object> progress = Map.of(
                "startDate", profile.getInternshipCompany() != null && !profile.getInternshipCompany().equals("Pending"),
                "diaryCount", diaryCount,
                "midTerm", diaryCount >= 5,
                "finalReport", diaryCount >= 10
        );
        return ResponseEntity.ok(progress);
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> updateMyProfile(@RequestBody StudentProfileDto dto, Principal principal) {
        StudentProfile existing = studentProfileRepository.findByUsername(principal.getName())
                .orElseGet(() -> {
                    StudentProfile blank = new StudentProfile();
                    blank.setUsername(principal.getName());
                    blank.setFirstName("Student");
                    blank.setLastName("User");
                    blank.setEmail(principal.getName());
                    blank.setStudentNumber(principal.getName());
                    blank.setRegistrationNumber(principal.getName());
                    blank.setDegreeProgram("Pending");
                    blank.setYearOfStudy(1);
                    blank.setPhoneNumber("Pending");
                    blank.setInternshipCompany("Pending");
                    blank.setUniversitySupervisor("Pending");
                    blank.setIndustrialSupervisorId("Pending");
                    blank.setCompanyId(null);
                    blank.setPictureUrl("/images/student-placeholder.png");
                    return blank;
                });
        merge(existing, dto);
        return ResponseEntity.ok(studentProfileRepository.save(existing));
    }

    private void merge(StudentProfile existing, StudentProfileDto dto) {
        if (dto == null) {
            return;
        }
        if (dto.getFirstName() != null) {
            existing.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null) {
            existing.setLastName(dto.getLastName());
        }
        if (dto.getEmail() != null) {
            existing.setEmail(dto.getEmail());
        }
        if (dto.getStudentNumber() != null) {
            existing.setStudentNumber(dto.getStudentNumber());
        }
        if (dto.getRegistrationNumber() != null) {
            existing.setRegistrationNumber(dto.getRegistrationNumber());
        }
        if (dto.getDegreeProgram() != null) {
            existing.setDegreeProgram(dto.getDegreeProgram());
        }
        if (dto.getYearOfStudy() != null) {
            existing.setYearOfStudy(dto.getYearOfStudy());
        }
        if (dto.getPhoneNumber() != null) {
            existing.setPhoneNumber(dto.getPhoneNumber());
        }
        if (dto.getInternshipCompany() != null) {
            existing.setInternshipCompany(dto.getInternshipCompany());
        }
        if (dto.getUniversitySupervisor() != null) {
            existing.setUniversitySupervisor(dto.getUniversitySupervisor());
        }
        if (dto.getIndustrialSupervisorId() != null) {
            existing.setIndustrialSupervisorId(dto.getIndustrialSupervisorId());
        }
        if (dto.getCompanyId() != null) {
            existing.setCompanyId(dto.getCompanyId());
        }
        if (dto.getPictureUrl() != null) {
            existing.setPictureUrl(dto.getPictureUrl());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> getAllStudents() {
        return studentProfileRepository.findAll();
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<String> exportStudentsCsv() {
        List<StudentProfile> students = studentProfileRepository.findAll();
        String csv = students.stream()
                .map(s -> String.join(",",
                        escape(s.getId()),
                        escape(s.getUsername()),
                        escape(s.getFirstName()),
                        escape(s.getLastName()),
                        escape(s.getEmail()),
                        escape(s.getStudentNumber()),
                        escape(s.getRegistrationNumber()),
                        escape(s.getDegreeProgram()),
                        escape(s.getYearOfStudy()),
                        escape(s.getPhoneNumber()),
                        escape(s.getInternshipCompany()),
                        escape(s.getUniversitySupervisor()),
                        escape(s.getCompanyId())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Username,FirstName,LastName,Email,StudentNumber,RegistrationNumber,DegreeProgram,YearOfStudy,PhoneNumber,InternshipCompany,UniversitySupervisor,CompanyId\n" + csv;
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
    public List<StudentProfile> getStudentsByCompany(@PathVariable String companyId) {
        return studentProfileRepository.findByCompanyId(companyId);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> searchStudents(@RequestParam String q) {
        return studentProfileRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<StudentProfile> updateStudent(@PathVariable Long id, @RequestBody StudentProfile student) {
        return studentProfileRepository.findById(id)
                .map(existing -> {
                    existing.setFirstName(student.getFirstName());
                    existing.setLastName(student.getLastName());
                    existing.setEmail(student.getEmail());
                    existing.setStudentNumber(student.getStudentNumber());
                    existing.setRegistrationNumber(student.getRegistrationNumber());
                    existing.setDegreeProgram(student.getDegreeProgram());
                    existing.setYearOfStudy(student.getYearOfStudy());
                    existing.setPhoneNumber(student.getPhoneNumber());
                    existing.setInternshipCompany(student.getInternshipCompany());
                    existing.setUniversitySupervisor(student.getUniversitySupervisor());
                    existing.setIndustrialSupervisorId(student.getIndustrialSupervisorId());
                    existing.setCompanyId(student.getCompanyId());
                    existing.setPictureUrl(student.getPictureUrl());
                    return ResponseEntity.ok(studentProfileRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        if (studentProfileRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dayDiaryRepository.findAll().stream()
                .filter(diary -> diary.getStudentProfile() != null
                        && diary.getStudentProfile().getId().equals(id))
                .forEach(dayDiaryRepository::delete);
        studentProfileRepository.deleteById(id);
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
