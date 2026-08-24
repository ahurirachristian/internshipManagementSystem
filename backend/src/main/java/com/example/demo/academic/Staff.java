package com.example.demo.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "staff")
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staff_id")
    private Integer staffId;

    @Column(name = "university_id")
    private Integer universityId;

    @Column(name = "unit_id")
    private Integer unitId;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(length = 20)
    private String contact;

    @Column(length = 150)
    private String email;

    @Column(length = 50)
    private String role;

    public Staff() {
    }

    public Staff(Integer universityId, Integer unitId, String fullName, String contact, String email, String role) {
        this.universityId = universityId;
        this.unitId = unitId;
        this.fullName = fullName;
        this.contact = contact;
        this.email = email;
        this.role = role;
    }

    public Integer getStaffId() { return staffId; }
    public void setStaffId(Integer staffId) { this.staffId = staffId; }

    public Integer getUniversityId() { return universityId; }
    public void setUniversityId(Integer universityId) { this.universityId = universityId; }

    public Integer getUnitId() { return unitId; }
    public void setUnitId(Integer unitId) { this.unitId = unitId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
