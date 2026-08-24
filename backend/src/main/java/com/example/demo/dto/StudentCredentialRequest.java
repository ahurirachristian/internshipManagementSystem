package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class StudentCredentialRequest {

    @NotBlank(message = "Student name is required")
    @Size(min = 2, max = 100, message = "Student name must be between 2 and 100 characters")
    private String studentName;

    @NotBlank(message = "Student number is required")
    @Size(min = 1, max = 100, message = "Student number must be between 1 and 100 characters")
    private String studentNo;

    @NotBlank(message = "Registration number is required")
    @Size(min = 1, max = 100, message = "Registration number must be between 1 and 100 characters")
    private String regNo;

    @NotBlank(message = "Intake is required")
    private String intake;

    @NotBlank(message = "Program is required")
    private String program;

    @NotBlank(message = "Course name is required")
    private String courseName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    public StudentCredentialRequest() {
    }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }

    public String getRegNo() { return regNo; }
    public void setRegNo(String regNo) { this.regNo = regNo; }

    public String getIntake() { return intake; }
    public void setIntake(String intake) { this.intake = intake; }

    public String getProgram() { return program; }
    public void setProgram(String program) { this.program = program; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
