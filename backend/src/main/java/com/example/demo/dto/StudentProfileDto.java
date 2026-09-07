package com.example.demo.dto;

import java.time.LocalDate;

public class StudentProfileDto {

    private Long id;
    private String studentName;
    private String studentNo;
    private String regNo;
    private String intake;
    private String program;
    private String courseName;
    private String mobileNo;
    private String email;
    private String yearOfStudy;
    private String academicYear;
    private String semester;
    private String organisation;
    private String location;
    private String academicSupervisor;
    private String academicSupervisorContact;
    private String fieldSupervisor;
    private String fieldSupervisorContact;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer unitId;
    private Integer courseId;
    private Integer academicSupervisorId;
    private Integer fieldSupervisorId;

    public StudentProfileDto() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getMobileNo() { return mobileNo; }
    public void setMobileNo(String mobileNo) { this.mobileNo = mobileNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getYearOfStudy() { return yearOfStudy; }
    public void setYearOfStudy(String yearOfStudy) { this.yearOfStudy = yearOfStudy; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getOrganisation() { return organisation; }
    public void setOrganisation(String organisation) { this.organisation = organisation; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getAcademicSupervisor() { return academicSupervisor; }
    public void setAcademicSupervisor(String academicSupervisor) { this.academicSupervisor = academicSupervisor; }

    public String getAcademicSupervisorContact() { return academicSupervisorContact; }
    public void setAcademicSupervisorContact(String academicSupervisorContact) { this.academicSupervisorContact = academicSupervisorContact; }

    public String getFieldSupervisor() { return fieldSupervisor; }
    public void setFieldSupervisor(String fieldSupervisor) { this.fieldSupervisor = fieldSupervisor; }

    public String getFieldSupervisorContact() { return fieldSupervisorContact; }
    public void setFieldSupervisorContact(String fieldSupervisorContact) { this.fieldSupervisorContact = fieldSupervisorContact; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Integer getUnitId() { return unitId; }
    public void setUnitId(Integer unitId) { this.unitId = unitId; }

    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer courseId) { this.courseId = courseId; }

    public Integer getAcademicSupervisorId() { return academicSupervisorId; }
    public void setAcademicSupervisorId(Integer academicSupervisorId) { this.academicSupervisorId = academicSupervisorId; }

    public Integer getFieldSupervisorId() { return fieldSupervisorId; }
    public void setFieldSupervisorId(Integer fieldSupervisorId) { this.fieldSupervisorId = fieldSupervisorId; }
}
