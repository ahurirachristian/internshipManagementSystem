package com.example.demo.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "company_departments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"company_id", "department_name"})
})
public class CompanyDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "department_name", nullable = false, length = 150)
    private String departmentName;

    @Column(name = "head_name", length = 150)
    private String headName;

    @Column(name = "head_contact", length = 30)
    private String headContact;

    @Column(name = "head_email", length = 150)
    private String headEmail;

    public CompanyDepartment() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public String getHeadName() { return headName; }
    public void setHeadName(String headName) { this.headName = headName; }

    public String getHeadContact() { return headContact; }
    public void setHeadContact(String headContact) { this.headContact = headContact; }

    public String getHeadEmail() { return headEmail; }
    public void setHeadEmail(String headEmail) { this.headEmail = headEmail; }
}
