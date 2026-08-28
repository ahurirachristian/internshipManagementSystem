package com.example.demo.university;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "universities")
public class University {

    @Id
    @Column(name = "university_id", nullable = false)
    private Long universityId;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = true)
    private String code;

    @Column(nullable = true)
    private String email;

    @Transient
    private String location;

    public University() {
    }

    public University(String name) {
        this.name = name;
    }

    public University(String name, String code, String location, String email) {
        this.name = name;
        this.code = code;
        this.location = location;
        this.email = email;
    }

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
