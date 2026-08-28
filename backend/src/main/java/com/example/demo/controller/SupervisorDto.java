package com.example.demo.controller;

public class SupervisorDto {

    private Long id;
    private String username;
    private String role;
    private Long companyId;
    private Long universityId;

    public SupervisorDto() {
    }

    public SupervisorDto(Long id, String username, String role, Long companyId, Long universityId) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.companyId = companyId;
        this.universityId = universityId;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }
}
