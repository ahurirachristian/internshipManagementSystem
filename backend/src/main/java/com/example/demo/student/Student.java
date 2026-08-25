package com.example.demo.student;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "university_id", nullable = false)
    private Long universityId;

    @Column(name = "internship_company_id", nullable = true)
    private Long internshipCompanyId;

    @Column(name = "uni_supervisor_id", nullable = true)
    private Long uniSupervisorId;

    @Column(name = "ind_supervisor_id", nullable = true)
    private Long indSupervisorId;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "registration_number", nullable = false)
    private String registrationNumber;

    @Column(name = "student_number", nullable = false)
    private String studentNumber;

    @Column(name = "degree_program", nullable = false)
    private String degreeProgram;

    @Column(name = "year_of_study", nullable = true)
    private Integer yearOfStudy;

    @Column(name = "phone_number", nullable = true)
    private String phoneNumber;

    // R3 preserved columns (MIGRATION_PLAN.md): carried over from Model A
    @Column(name = "intake", nullable = true)
    private String intake;

    @Column(name = "academic_year", nullable = true)
    private String academicYear;

    @Column(name = "semester", nullable = true)
    private String semester;

    @Column(name = "start_date", nullable = true)
    private java.time.LocalDate startDate;

    @Column(name = "end_date", nullable = true)
    private java.time.LocalDate endDate;

    @Column(name = "school_id", nullable = true)
    private Long schoolId;

    @Column(name = "department_id", nullable = true)
    private Long departmentId;

    @Column(name = "programme_id", nullable = true)
    private Long programmeId;

    public Student() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }

    public Long getInternshipCompanyId() {
        return internshipCompanyId;
    }

    public void setInternshipCompanyId(Long internshipCompanyId) {
        this.internshipCompanyId = internshipCompanyId;
    }

    public Long getUniSupervisorId() {
        return uniSupervisorId;
    }

    public void setUniSupervisorId(Long uniSupervisorId) {
        this.uniSupervisorId = uniSupervisorId;
    }

    public Long getIndSupervisorId() {
        return indSupervisorId;
    }

    public void setIndSupervisorId(Long indSupervisorId) {
        this.indSupervisorId = indSupervisorId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getStudentNumber() {
        return studentNumber;
    }

    public void setStudentNumber(String studentNumber) {
        this.studentNumber = studentNumber;
    }

    public String getDegreeProgram() {
        return degreeProgram;
    }

    public void setDegreeProgram(String degreeProgram) {
        this.degreeProgram = degreeProgram;
    }

    public Integer getYearOfStudy() {
        return yearOfStudy;
    }

    public void setYearOfStudy(Integer yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getIntake() {
        return intake;
    }

    public void setIntake(String intake) {
        this.intake = intake;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public java.time.LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(java.time.LocalDate startDate) {
        this.startDate = startDate;
    }

    public java.time.LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(java.time.LocalDate endDate) {
        this.endDate = endDate;
    }

    public Long getSchoolId() {
        return schoolId;
    }

    public void setSchoolId(Long schoolId) {
        this.schoolId = schoolId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public Long getProgrammeId() {
        return programmeId;
    }

    public void setProgrammeId(Long programmeId) {
        this.programmeId = programmeId;
    }
}
