package com.example.demo.student;

import java.time.LocalDate;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_name", nullable = false)
    private String studentName;

    @Column(name = "student_no", nullable = false, unique = true, length = 100)
    private String studentNo;

    @Column(name = "reg_no", nullable = false, unique = true, length = 100)
    private String regNo;

    @Column(nullable = false, length = 50)
    private String intake;

    @Column(nullable = false, length = 100)
    private String program;

    @Column(name = "course_name", nullable = false, length = 100)
    private String courseName;

    @Column(name = "mobile_no", length = 20)
    private String mobileNo;

    @Column(nullable = false)
    private String email;

    @Column(name = "year_of_study", nullable = false, length = 20)
    private String yearOfStudy;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(nullable = false, length = 20)
    private String semester;

    @Column(nullable = false)
    private String organisation;

    @Column(nullable = false)
    private String location;

    @Column(name = "academic_supervisor", nullable = false)
    private String academicSupervisor;

    @Column(name = "academic_supervisor_contact", length = 20)
    private String academicSupervisorContact;

    @Column(name = "field_supervisor", nullable = false)
    private String fieldSupervisor;

    @Column(name = "field_supervisor_contact", length = 20)
    private String fieldSupervisorContact;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Lob
    private byte[] picture;

    @Column(name = "unit_id")
    private Integer unitId;

    @Column(name = "course_id")
    private Integer courseId;

    @Column(name = "academic_supervisor_id")
    private Integer academicSupervisorId;

    @Column(name = "field_supervisor_id")
    private Integer fieldSupervisorId;

    public StudentProfile() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentNo() { return studentNo; }
    public void setStudentNo(String studentNo) { this.studentNo = studentNo; }

    public String getRegNo() { return regNo; }
    public void setRegNo(String regNo) { this.regNo = regNo; }

    public String getIntake() { return intake; }
    public void setIntake(String intake) { this.intake = intake; }

    public String getProgram() { return program; }
    public void setProgram(String program) { this.program = program; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getMobileNo() { return mobileNo; }
    public void setMobileNo(String mobileNo) { this.mobileNo = mobileNo; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getYearOfStudy() { return yearOfStudy; }
    public void setYearOfStudy(String yearOfStudy) { this.yearOfStudy = yearOfStudy; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public String getOrganisation() { return organisation; }
    public void setOrganisation(String organisation) { this.organisation = organisation; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getAcademicSupervisor() { return academicSupervisor; }
    public void setAcademicSupervisor(String academicSupervisor) { this.academicSupervisor = academicSupervisor; }

    public String getAcademicSupervisorContact() { return academicSupervisorContact; }
    public void setAcademicSupervisorContact(String academicSupervisorContact) { this.academicSupervisorContact = academicSupervisorContact; }

    public String getFieldSupervisor() { return fieldSupervisor; }
    public void setFieldSupervisor(String fieldSupervisor) { this.fieldSupervisor = fieldSupervisor; }

    public String getFieldSupervisorContact() { return fieldSupervisorContact; }
    public void setFieldSupervisorContact(String fieldSupervisorContact) { this.fieldSupervisorContact = fieldSupervisorContact; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public byte[] getPicture() { return picture; }
    public void setPicture(byte[] picture) { this.picture = picture; }

    public Integer getUnitId() { return unitId; }
    public void setUnitId(Integer unitId) { this.unitId = unitId; }

    public Integer getCourseId() { return courseId; }
    public void setCourseId(Integer courseId) { this.courseId = courseId; }

    public Integer getAcademicSupervisorId() { return academicSupervisorId; }
    public void setAcademicSupervisorId(Integer academicSupervisorId) { this.academicSupervisorId = academicSupervisorId; }

    public Integer getFieldSupervisorId() { return fieldSupervisorId; }
    public void setFieldSupervisorId(Integer fieldSupervisorId) { this.fieldSupervisorId = fieldSupervisorId; }
}
