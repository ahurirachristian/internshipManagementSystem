package com.example.demo.dto;

import java.time.LocalDate;

/**
 * Model-B student transfer object (M3, MIGRATION_PLAN.md). Flat projection
 * of the students table; no legacy StudentProfile aliases.
 */
public class StudentDto {

    private Long id;
    private Long userId;
    private Long universityId;
    private Long internshipCompanyId;
    private Long uniSupervisorId;
    private Long indSupervisorId;
    private String firstName;
    private String lastName;
    private String registrationNumber;
    private String studentNumber;
    private String degreeProgram;
    private Integer yearOfStudy;
    private String phoneNumber;
    private String gender;
    private String intake;
    private String academicYear;
    private String semester;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long schoolId;
    private Long departmentId;
    private Long programmeId;
    private String username;

    // Joined display fields (populated in StudentController.toDto)
    private String email;
    private String departmentName;
    private String programmeName;
    private String universityName;
    private String companyName;
    private String companyBranch;
    private String companyAddress;
    private String companyWebsite;
    private String universitySupervisor;
    private String universitySupervisorPhone;
    private String industrialSupervisor;
    private String industrialSupervisorPhone;

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

    public String getFullName() {
        if (firstName == null && lastName == null) {
            return null;
        }
        return (firstName == null ? "" : firstName)
                + (lastName == null ? "" : (firstName == null ? "" : " ") + lastName);
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

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
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

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public String getProgrammeName() {
        return programmeName;
    }

    public void setProgrammeName(String programmeName) {
        this.programmeName = programmeName;
    }

    public String getUniversityName() {
        return universityName;
    }

    public void setUniversityName(String universityName) {
        this.universityName = universityName;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getCompanyBranch() {
        return companyBranch;
    }

    public void setCompanyBranch(String companyBranch) {
        this.companyBranch = companyBranch;
    }

    public String getCompanyAddress() {
        return companyAddress;
    }

    public void setCompanyAddress(String companyAddress) {
        this.companyAddress = companyAddress;
    }

    public String getCompanyWebsite() {
        return companyWebsite;
    }

    public void setCompanyWebsite(String companyWebsite) {
        this.companyWebsite = companyWebsite;
    }

    public String getUniversitySupervisor() {
        return universitySupervisor;
    }

    public void setUniversitySupervisor(String universitySupervisor) {
        this.universitySupervisor = universitySupervisor;
    }

    public String getUniversitySupervisorPhone() {
        return universitySupervisorPhone;
    }

    public void setUniversitySupervisorPhone(String universitySupervisorPhone) {
        this.universitySupervisorPhone = universitySupervisorPhone;
    }

    public String getIndustrialSupervisor() {
        return industrialSupervisor;
    }

    public void setIndustrialSupervisor(String industrialSupervisor) {
        this.industrialSupervisor = industrialSupervisor;
    }

    public String getIndustrialSupervisorPhone() {
        return industrialSupervisorPhone;
    }

    public void setIndustrialSupervisorPhone(String industrialSupervisorPhone) {
        this.industrialSupervisorPhone = industrialSupervisorPhone;
    }
}
