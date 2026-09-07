package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UniversityRequest {

    @NotBlank(message = "Short form is required")
    @Size(min = 1, max = 15, message = "Short form must be between 1 and 15 characters")
    private String shortForm;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 200, message = "Full name must be between 2 and 200 characters")
    private String fullName;

    @Size(max = 100, message = "Country must be at most 100 characters")
    private String country;

    private Integer establishedYear;

    public UniversityRequest() {
    }

    public String getShortForm() { return shortForm; }
    public void setShortForm(String shortForm) { this.shortForm = shortForm; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public Integer getEstablishedYear() { return establishedYear; }
    public void setEstablishedYear(Integer establishedYear) { this.establishedYear = establishedYear; }
}
