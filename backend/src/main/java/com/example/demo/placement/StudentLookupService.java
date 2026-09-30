package com.example.demo.placement;

import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.audit.AuditLogService;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * P7 (R8/L9): vetted companies (and university staff) can resolve a student
 * by university + student number. The result is scoped per plan §13-D4 and
 * every lookup is audited with the acting account and client IP; unknown
 * students produce a generic 404 so numbers cannot be probed (L9).
 */
@Service
public class StudentLookupService {

    private final StudentRepository studentRepository;
    private final com.example.demo.auth.UserRepository userRepository;
    private final AuditLogService auditLogService;

    public StudentLookupService(StudentRepository studentRepository,
            com.example.demo.auth.UserRepository userRepository, AuditLogService auditLogService) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public StudentLookupDto lookup(UserEntity actor, Long universityId, String studentNumber, String ip) {
        Long uni = universityId;
        // L9: a company always looks inside its own scope only — but a company
        // is not university-bound, so it must name the university explicitly.
        if (actor.getRole() == Role.SUPERVISOR) {
            uni = actor.getUniversityId();
        }
        if (uni == null) {
            throw new IllegalArgumentException("A university is required.");
        }
        if (studentNumber == null || studentNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("A student number is required.");
        }

        Student student = studentRepository.findByUniversityIdAndStudentNumber(uni, studentNumber.trim())
                .orElse(null);

        auditLogService.log(actor.getUsername(), actor.getRole().name(), "STUDENT_LOOKUP", "Student",
                student == null
                        ? "Lookup of university " + uni + " number '" + studentNumber.trim() + "' (no match)"
                        : "Lookup of studentId " + student.getId() + " (university " + uni + ")",
                ip);

        // Generic message after the audit row: no oracle for probing numbers.
        if (student == null) {
            throw new NoSuchElementException("Student not found.");
        }

        UserEntity studentUser = userRepository.findById(student.getUserId()).orElse(null);
        return new StudentLookupDto(
                student.getId(),
                student.getUserId(),
                student.getFirstName(),
                student.getLastName(),
                student.getStudentNumber(),
                student.getRegistrationNumber(),
                student.getDegreeProgram(),
                student.getYearOfStudy(),
                studentUser != null && studentUser.getEmail() != null ? studentUser.getEmail() : null,
                student.getPhoneNumber(),
                student.getUniversityId(),
                student.getSchoolId(),
                student.getDepartmentId(),
                student.getProgrammeId(),
                List.of());
    }
}
