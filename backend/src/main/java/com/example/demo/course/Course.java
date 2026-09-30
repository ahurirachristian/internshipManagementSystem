package com.example.demo.course;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * P8 (R8): a course unit taught inside a programme of a university. The
 * university scope mirrors the supervisor's own university (L7); the
 * student lookup exposes these as the {@code units} list.
 */
@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "university_id", nullable = false)
    private Long universityId;

    @Column(name = "programme_id", nullable = false)
    private Long programmeId;

    /** 1..durationYears; null means "all years". */
    @Column(name = "year_of_study", nullable = true)
    private Integer yearOfStudy;

    @Column(name = "course_code", nullable = false, length = 50)
    private String courseCode;

    @Column(name = "course_name", nullable = false, length = 200)
    private String courseName;

    public Course() {
    }

    public Course(Long universityId, Long programmeId, Integer yearOfStudy, String courseCode, String courseName) {
        this.universityId = universityId;
        this.programmeId = programmeId;
        this.yearOfStudy = yearOfStudy;
        this.courseCode = courseCode;
        this.courseName = courseName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUniversityId() {
        return universityId;
    }

    public void setUniversityId(Long universityId) {
        this.universityId = universityId;
    }

    public Long getProgrammeId() {
        return programmeId;
    }

    public void setProgrammeId(Long programmeId) {
        this.programmeId = programmeId;
    }

    public Integer getYearOfStudy() {
        return yearOfStudy;
    }

    public void setYearOfStudy(Integer yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }
}
