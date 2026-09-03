package com.example.demo.dto;

public class LearningInstituteDto {

    private Long id;
    private String name;
    private String code;
    private String email;
    private String location;

    public LearningInstituteDto() {
    }

    public LearningInstituteDto(Long id, String name, String code, String email, String location) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.email = email;
        this.location = location;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
