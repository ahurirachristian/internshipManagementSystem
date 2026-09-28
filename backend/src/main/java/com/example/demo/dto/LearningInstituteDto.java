package com.example.demo.dto;

public class LearningInstituteDto {
<<<<<<< HEAD

    private Long id;
    private String name;
    private String code;
    private String email;
    private String location;
=======
    private Long id;
    private String name;
    private String shortForm;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String website;
>>>>>>> developer

    public LearningInstituteDto() {
    }

<<<<<<< HEAD
    public LearningInstituteDto(Long id, String name, String code, String email, String location) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.email = email;
        this.location = location;
    }

=======
>>>>>>> developer
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

<<<<<<< HEAD
    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
=======
    public String getShortForm() {
        return shortForm;
    }

    public void setShortForm(String shortForm) {
        this.shortForm = shortForm;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
>>>>>>> developer
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

<<<<<<< HEAD
    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
=======
    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
>>>>>>> developer
    }
}
