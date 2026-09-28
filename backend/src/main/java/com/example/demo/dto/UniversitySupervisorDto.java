package com.example.demo.dto;

public class UniversitySupervisorDto {
<<<<<<< HEAD

    private Long id;
    private Long userId;
    private Long universityId;
    private String firstName;
    private String lastName;
    private String department;
    private String phoneNumber;
=======
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String department;
>>>>>>> developer
    private String universityName;

    public UniversitySupervisorDto() {
    }

<<<<<<< HEAD
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

=======
>>>>>>> developer
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

<<<<<<< HEAD
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

=======
>>>>>>> developer
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

<<<<<<< HEAD
    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
=======
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
>>>>>>> developer
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

<<<<<<< HEAD
=======
    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

>>>>>>> developer
    public String getUniversityName() {
        return universityName;
    }

    public void setUniversityName(String universityName) {
        this.universityName = universityName;
    }
}
