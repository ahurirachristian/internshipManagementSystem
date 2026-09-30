package com.example.demo.placement;

import java.util.List;

import com.example.demo.student.Student;

/**
 * P7 (R8, plan §13-D4): what a company may see when it looks up a student.
 * The internship office needs the full academic profile plus contact
 * details, and every lookup is audited.
 */
public record StudentLookupDto(
        Long studentId,
        Long userId,
        String firstName,
        String lastName,
        String studentNumber,
        String registrationNumber,
        String degreeProgram,
        Integer yearOfStudy,
        String email,
        String phoneNumber,
        Long universityId,
        Long schoolId,
        Long departmentId,
        Long programmeId,
        List<Object> units) {
}
