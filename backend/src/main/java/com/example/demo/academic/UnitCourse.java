package com.example.demo.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "unit_courses", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"unit_id", "course_id"})
})
public class UnitCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "unit_id", nullable = false)
    private Integer unitId;

    @Column(name = "course_id", nullable = false)
    private Integer courseId;

    public UnitCourse() {
    }

    public UnitCourse(Integer unitId, Integer courseId) {
        this.unitId = unitId;
        this.courseId = courseId;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getUnitId() { return unitId; }
    public void setUnitId(Integer unitId) { this.unitId = unitId; }

    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer courseId) { this.courseId = courseId; }
}
