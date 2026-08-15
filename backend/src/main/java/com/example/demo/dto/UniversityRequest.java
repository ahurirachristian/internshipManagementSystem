package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UniversityRequest {

    @NotBlank(message = "University name is required")
    @Size(min = 2, max = 150, message = "University name must be between 2 and 150 characters")
    private String name;

    @Size(max = 20, message = "Code must be at most 20 characters")
    private String code;

    @Size(max = 200, message = "Location must be at most 200 characters")
    private String location;

    @Email(message = "Email should be valid")
    private String email;

    public UniversityRequest() {
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
