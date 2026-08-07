package com.example.demo.student;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String studentNumber;

    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    private String degreeProgram;

    @Column(nullable = false)
    private Integer yearOfStudy;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String internshipCompany;

    @Column(nullable = false)
    private String universitySupervisor;

    @Column(nullable = false)
    private String industrialSupervisorId;

    @Column(nullable = false)
    private String companyId;

    @Column(nullable = false)
    private String pictureUrl;

    public StudentProfile() {
    }

    public StudentProfile(String username, String firstName, String lastName, String email,
            String studentNumber, String registrationNumber, String degreeProgram, Integer yearOfStudy,
            String phoneNumber, String internshipCompany, String universitySupervisor,
            String industrialSupervisorId, String companyId, String pictureUrl) {
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.studentNumber = studentNumber;
        this.registrationNumber = registrationNumber;
        this.degreeProgram = degreeProgram;
        this.yearOfStudy = yearOfStudy;
        this.phoneNumber = phoneNumber;
        this.internshipCompany = internshipCompany;
        this.universitySupervisor = universitySupervisor;
        this.industrialSupervisorId = industrialSupervisorId;
        this.companyId = companyId;
        this.pictureUrl = pictureUrl;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getStudentNumber() {
        return studentNumber;
    }

    public void setStudentNumber(String studentNumber) {
        this.studentNumber = studentNumber;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
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

    public String getInternshipCompany() {
        return internshipCompany;
    }

    public void setInternshipCompany(String internshipCompany) {
        this.internshipCompany = internshipCompany;
    }

    public String getUniversitySupervisor() {
        return universitySupervisor;
    }

    public void setUniversitySupervisor(String universitySupervisor) {
        this.universitySupervisor = universitySupervisor;
    }

    public String getIndustrialSupervisorId() {
        return industrialSupervisorId;
    }

    public void setIndustrialSupervisorId(String industrialSupervisorId) {
        this.industrialSupervisorId = industrialSupervisorId;
    }

    public String getCompanyId() {
        return companyId;
    }

    public void setCompanyId(String companyId) {
        this.companyId = companyId;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }

    public void setPictureUrl(String pictureUrl) {
        this.pictureUrl = pictureUrl;
    }
}
