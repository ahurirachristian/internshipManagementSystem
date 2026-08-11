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

<<<<<<< HEAD
    @Column(nullable = true)
    private String provider;

    @Column(nullable = true, unique = true)
    private String providerId;
=======
    @Column(name = "company_id", nullable = true)
    private Long companyId;

    @Column(name = "university_id", nullable = true)
    private Long universityId;
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264

    public UserEntity() {
    }

    public UserEntity(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

<<<<<<< HEAD
    public UserEntity(String username, String password, Role role, String provider, String providerId) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
=======
    public UserEntity(String username, String password, Role role, Long companyId, Long universityId) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.companyId = companyId;
        this.universityId = universityId;
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
    }

    public Long getId() {
        return id;
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

<<<<<<< HEAD
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
=======
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
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
    }
}
