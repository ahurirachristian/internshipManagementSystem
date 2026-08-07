package com.example.demo.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "company")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String location;

    @Column(nullable = true)
    private String email;

    @Column(nullable = true)
    private String phone;

    @Column(nullable = true)
    private String website;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String profile;

    @Column(nullable = false)
    private String department;

    @Column(name = "field_supervisor", nullable = false)
    private String fieldSupervisor;

    @Column(nullable = true)
    private String roles;

    public Company() {
    }

    public Company(String name, String location, String email, String phone, String website, String profile, String department, String fieldSupervisor, String roles) {
        this.name = name;
        this.location = location;
        this.email = email;
        this.phone = phone;
        this.website = website;
        this.profile = profile;
        this.department = department;
        this.fieldSupervisor = fieldSupervisor;
        this.roles = roles;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getProfile() { return profile; }
    public void setProfile(String profile) { this.profile = profile; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getFieldSupervisor() { return fieldSupervisor; }
    public void setFieldSupervisor(String fieldSupervisor) { this.fieldSupervisor = fieldSupervisor; }

    public String getRoles() { return roles; }
    public void setRoles(String roles) { this.roles = roles; }
}