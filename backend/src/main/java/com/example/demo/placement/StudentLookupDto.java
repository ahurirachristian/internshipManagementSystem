package com.example.demo.placement;

import java.util.List;

import com.example.demo.course.Course;

/**
 * P7 (R8, plan §13-D4): what a company may see when it looks up a student.
 * The internship office needs the full academic profile plus contact
 * details, and every lookup is audited. Since P8, {@code units} carries the
 * course units of the student's programme and year of study.
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
        List<Course> units) {
}
