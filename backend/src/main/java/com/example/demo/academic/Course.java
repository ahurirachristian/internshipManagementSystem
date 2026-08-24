package com.example.demo.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "course_id")
    private Integer courseId;

    @Column(name = "university_id", nullable = false)
    private Integer universityId;

    @Column(name = "course_name", nullable = false, length = 200)
    private String courseName;

    @Column(nullable = false, length = 20)
    private String duration;

    // Stored as String because SQL ENUM contains 'Short Course' (space)
    @Column(length = 20)
    private String level;

    public Course() {
    }

    public Course(Integer universityId, String courseName, String duration, String level) {
        this.universityId = universityId;
        this.courseName = courseName;
        this.duration = duration;
        this.level = level;
    }

    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer courseId) { this.courseId = courseId; }

    public Integer getUniversityId() { return universityId; }
    public void setUniversityId(Integer universityId) { this.universityId = universityId; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
}
