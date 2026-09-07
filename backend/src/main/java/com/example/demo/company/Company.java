package com.example.demo.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "company")
public class Company {

    public enum Size { Small, Medium, Large, Enterprise }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String name;

    @Column(name = "registration_number", unique = true, length = 50)
    private String registrationNumber;

    @Column(length = 100)
    private String industry;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Size size;

    @Column(length = 255)
    private String website;

    @Column(length = 255)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String city;

    @Column(name = "physical_address", length = 500)
    private String physicalAddress;

    @Column(name = "postal_address", length = 500)
    private String postalAddress;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "company")
    private List<CompanyDepartment> departments = new ArrayList<>();

    @OneToMany(mappedBy = "company")
    private List<CompanySupervisor> supervisors = new ArrayList<>();

    public Company() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }

    public Size getSize() { return size; }
    public void setSize(Size size) { this.size = size; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getPhysicalAddress() { return physicalAddress; }
    public void setPhysicalAddress(String physicalAddress) { this.physicalAddress = physicalAddress; }

    public String getPostalAddress() { return postalAddress; }
    public void setPostalAddress(String postalAddress) { this.postalAddress = postalAddress; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @JsonIgnore
    public List<CompanyDepartment> getDepartments() { return departments; }
    public void setDepartments(List<CompanyDepartment> departments) { this.departments = departments; }

    @JsonIgnore
    public List<CompanySupervisor> getSupervisors() { return supervisors; }
    public void setSupervisors(List<CompanySupervisor> supervisors) { this.supervisors = supervisors; }
}
