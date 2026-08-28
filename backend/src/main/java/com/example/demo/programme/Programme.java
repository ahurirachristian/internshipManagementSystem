package com.example.demo.programme;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "programmes")
public class Programme {

    @Id
    @Column(name = "programme_id", nullable = false)
    private Integer programmeId;

    @Column(name = "school_id", nullable = false)
    private Integer schoolId;

    @Column(name = "university_id", nullable = false)
    private Integer universityId;

    @Column(name = "department_id", nullable = true)
    private Integer departmentId;

    @Column(name = "programme_code", nullable = false)
    private String programmeCode;

    @Column(name = "programme_name", nullable = false)
    private String programmeName;

    @Column(name = "programme_level", nullable = false)
    private String programmeLevel;

    @Column(name = "duration_years", nullable = false)
    private Integer durationYears;

    public Programme() {
    }

    public Integer getProgrammeId() {
        return programmeId;
    }

    public void setProgrammeId(Integer programmeId) {
        this.programmeId = programmeId;
    }

    public Integer getSchoolId() {
        return schoolId;
    }

    public void setSchoolId(Integer schoolId) {
        this.schoolId = schoolId;
    }

    public Integer getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Integer universityId) {
        this.universityId = universityId;
    }

    public Integer getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Integer departmentId) {
        this.departmentId = departmentId;
    }

    public String getProgrammeCode() {
        return programmeCode;
    }

    public void setProgrammeCode(String programmeCode) {
        this.programmeCode = programmeCode;
    }

    public String getProgrammeName() {
        return programmeName;
    }

    public void setProgrammeName(String programmeName) {
        this.programmeName = programmeName;
    }

    public String getProgrammeLevel() {
        return programmeLevel;
    }

    public void setProgrammeLevel(String programmeLevel) {
        this.programmeLevel = programmeLevel;
    }

    public Integer getDurationYears() {
        return durationYears;
    }

    public void setDurationYears(Integer durationYears) {
        this.durationYears = durationYears;
    }
}
