package com.example.demo.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "academic_units")
public class AcademicUnit {

    public enum UnitType {
        College, School, Faculty, Department, Institute, Directorate, Centre
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unit_id")
    private Integer unitId;

    @Column(name = "university_id", nullable = false)
    private Integer universityId;

    @Column(name = "parent_unit_id")
    private Integer parentUnitId;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_type", nullable = false, length = 20)
    private UnitType unitType;

    @Column(name = "unit_name", nullable = false, length = 200)
    private String unitName;

    @Column(name = "short_form", length = 15)
    private String shortForm;

    public AcademicUnit() {
    }

    public AcademicUnit(Integer universityId, UnitType unitType, String unitName) {
        this.universityId = universityId;
        this.unitType = unitType;
        this.unitName = unitName;
    }

    public AcademicUnit(Integer universityId, Integer parentUnitId, UnitType unitType, String unitName, String shortForm) {
        this.universityId = universityId;
        this.parentUnitId = parentUnitId;
        this.unitType = unitType;
        this.unitName = unitName;
        this.shortForm = shortForm;
    }

    public Integer getUnitId() { return unitId; }
    public void setUnitId(Integer unitId) { this.unitId = unitId; }

    public Integer getUniversityId() { return universityId; }
    public void setUniversityId(Integer universityId) { this.universityId = universityId; }

    public Integer getParentUnitId() { return parentUnitId; }
    public void setParentUnitId(Integer parentUnitId) { this.parentUnitId = parentUnitId; }

    public UnitType getUnitType() { return unitType; }
    public void setUnitType(UnitType unitType) { this.unitType = unitType; }

    public String getUnitName() { return unitName; }
    public void setUnitName(String unitName) { this.unitName = unitName; }

    public String getShortForm() { return shortForm; }
    public void setShortForm(String shortForm) { this.shortForm = shortForm; }
}
