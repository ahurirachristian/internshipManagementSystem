package com.example.demo.controller;

import java.util.List;
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
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public StudentController(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> getAllStudents() {
        return studentProfileRepository.findAll();
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
}
