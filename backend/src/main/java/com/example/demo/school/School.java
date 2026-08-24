package com.example.demo.school;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "schools")
public class School {

    @Id
    @Column(name = "school_id", nullable = false)
    private Integer schoolId;

    @Column(name = "school_code", nullable = true)
    private String schoolCode;

    @Column(name = "university_id", nullable = false)
    private Integer universityId;

    @Column(name = "school_name", nullable = false)
    private String schoolName;

    public School() {
    }

    public Integer getSchoolId() {
        return schoolId;
    }

    public void setSchoolId(Integer schoolId) {
        this.schoolId = schoolId;
    }

    public String getSchoolCode() {
        return schoolCode;
    }

    public void setSchoolCode(String schoolCode) {
        this.schoolCode = schoolCode;
    }

    public Integer getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Integer universityId) {
        this.universityId = universityId;
    }

    public String getSchoolName() {
        return schoolName;
    }

    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }
}
