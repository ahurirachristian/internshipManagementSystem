package com.example.demo.dto;

public class UniversitySupervisorDto {

    private Long id;
    private Long userId;
    private Long universityId;
    private String firstName;
    private String lastName;
    private String department;
    private String phoneNumber;
    private String universityName;

    public UniversitySupervisorDto() {
    }

    public UniversitySupervisorDto(Long id, Long userId, Long universityId, String firstName, String lastName,
            String department, String phoneNumber, String universityName) {
        this.id = id;
        this.userId = userId;
        this.universityId = universityId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.department = department;
        this.phoneNumber = phoneNumber;
        this.universityName = universityName;
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

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getUniversityName() {
        return universityName;
    }

    public void setUniversityName(String universityName) {
        this.universityName = universityName;
    }
}
