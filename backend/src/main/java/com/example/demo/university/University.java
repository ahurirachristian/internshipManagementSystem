package com.example.demo.university;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "universities")
public class University {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "university_id")
    private Integer universityId;

    @Column(name = "short_form", nullable = false, unique = true, length = 15)
    private String shortForm;

    @Column(name = "full_name", nullable = false, unique = true, length = 200)
    private String fullName;

    @Column(length = 100)
    private String country = "Uganda";

    @Column(name = "established_year")
    private Integer establishedYear;

    @Column(length = 200)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(name = "physical_address", length = 255)
    private String physicalAddress;

    @Column(length = 200)
    private String website;

    public University() {
    }

    public University(String shortForm, String fullName) {
        this.shortForm = shortForm;
        this.fullName = fullName;
    }

    public University(String shortForm, String fullName, String country, Integer establishedYear) {
        this.shortForm = shortForm;
        this.fullName = fullName;
        this.country = country;
        this.establishedYear = establishedYear;
    }

    public Integer getUniversityId() { return universityId; }
    public void setUniversityId(Integer universityId) { this.universityId = universityId; }

    public String getShortForm() { return shortForm; }
    public void setShortForm(String shortForm) { this.shortForm = shortForm; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public Integer getEstablishedYear() { return establishedYear; }
    public void setEstablishedYear(Integer establishedYear) { this.establishedYear = establishedYear; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPhysicalAddress() { return physicalAddress; }
    public void setPhysicalAddress(String physicalAddress) { this.physicalAddress = physicalAddress; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public Long getId() { return universityId == null ? null : universityId.longValue(); }
    public void setId(Long id) { this.universityId = id == null ? null : id.intValue(); }
}
