package com.example.demo.dto;

public class CompanyDetailsDto {
<<<<<<< HEAD

    private Long id;
    private String name;
    private String location;
    private String email;
    private String phone;
    private String website;
    private String profile;
    private String department;
    private String fieldSupervisor;
    private String roles;
=======
    private Long id;
    private String companyName;
    private String branch;
    private String physicalAddress;
    private String website;
    private String email;
    private String phone;
    private String contactPerson;
>>>>>>> developer

    public CompanyDetailsDto() {
    }

<<<<<<< HEAD
    public CompanyDetailsDto(Long id, String name, String location, String email, String phone,
            String website, String profile, String department, String fieldSupervisor, String roles) {
        this.id = id;
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

=======
>>>>>>> developer
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

<<<<<<< HEAD
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
=======
    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getPhysicalAddress() {
        return physicalAddress;
    }

    public void setPhysicalAddress(String physicalAddress) {
        this.physicalAddress = physicalAddress;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
>>>>>>> developer
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

<<<<<<< HEAD
    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        this.profile = profile;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getFieldSupervisor() {
        return fieldSupervisor;
    }

    public void setFieldSupervisor(String fieldSupervisor) {
        this.fieldSupervisor = fieldSupervisor;
    }

    public String getRoles() {
        return roles;
    }

    public void setRoles(String roles) {
        this.roles = roles;
=======
    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
>>>>>>> developer
    }
}
