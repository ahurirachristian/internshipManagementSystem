package com.example.demo.dto;

public class UniversityDto {

    private Integer universityId;
    private String shortForm;
    private String fullName;
    private String country;
    private Integer establishedYear;

    public UniversityDto() {
    }

    public UniversityDto(Integer universityId, String shortForm, String fullName, String country, Integer establishedYear) {
        this.universityId = universityId;
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
