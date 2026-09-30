package com.example.demo.dto;

public class UserDto {

    private Long id;
    private String username;
    private String role;
    private String email;
    private Long companyId;
    private Long universityId;
    private Boolean enabled;
    private Boolean superAdmin;
    private Boolean mustChangePassword;

    public UserDto() {
    }

    public UserDto(Long id, String username, String role) {
        this.id = id;
        this.username = username;
        this.role = role;
    }

    public UserDto(Long id, String username, String role, String email, Long companyId, Long universityId) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.email = email;
        this.companyId = companyId;
        this.universityId = universityId;
    }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Boolean getSuperAdmin() { return superAdmin; }
    public void setSuperAdmin(Boolean superAdmin) { this.superAdmin = superAdmin; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public Long getUniversityId() { return universityId; }
    public void setUniversityId(Long universityId) { this.universityId = universityId; }
}
