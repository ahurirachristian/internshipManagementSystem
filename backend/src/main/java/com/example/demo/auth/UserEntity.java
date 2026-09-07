package com.example.demo.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = true)
    private String provider;

    @Column(nullable = true, unique = true)
    private String providerId;

    @Column(name = "company_id", nullable = true)
    private Long companyId;

    @Column(name = "university_id", nullable = true)
    private Long universityId;

    @Column(nullable = true)
    private String email;

    @Column(name = "must_change_password", nullable = false)
    private Boolean mustChangePassword = true;

    @Column(name = "password_reset_token", nullable = true)
    private String passwordResetToken;

    public UserEntity() {
    }

    public UserEntity(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.mustChangePassword = true;
    }

    public UserEntity(String username, String password, Role role, String provider, String providerId) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
        this.mustChangePassword = true;
    }

    public UserEntity(String username, String password, Role role, Long companyId, Long universityId) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.companyId = companyId;
        this.universityId = universityId;
        this.mustChangePassword = true;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
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

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public String getPasswordResetToken() { return passwordResetToken; }
    public void setPasswordResetToken(String passwordResetToken) { this.passwordResetToken = passwordResetToken; }
}
