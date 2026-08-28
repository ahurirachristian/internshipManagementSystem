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
}
