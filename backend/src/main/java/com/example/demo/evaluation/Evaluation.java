package com.example.demo.evaluation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "evaluations")
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = true)
    private Long placementId;

    @Column(nullable = false)
    private String supervisorType;

    @Column(nullable = false)
    private String supervisorUsername;

    @Column(nullable = true)
    private Integer punctuality;

    @Column(nullable = true)
    private Integer practicalWorkEthics;

    @Column(nullable = true)
    private Integer attendance;

    @Column(nullable = true)
    private Integer workplacePerformance;

    @Column(nullable = true)
    private Integer logbookQuality;

    @Column(nullable = true)
    private Integer academicReport;

    @Column(nullable = true)
    private Integer presentation;

    @Column(nullable = true)
    private Integer overallGrade;

    public Evaluation() {
    }

    public Evaluation(Long studentId, Long placementId, String supervisorType, String supervisorUsername,
            Integer punctuality, Integer practicalWorkEthics, Integer attendance, Integer workplacePerformance,
            Integer logbookQuality, Integer academicReport, Integer presentation, Integer overallGrade) {
        this.studentId = studentId;
        this.placementId = placementId;
        this.supervisorType = supervisorType;
        this.supervisorUsername = supervisorUsername;
        this.punctuality = punctuality;
        this.practicalWorkEthics = practicalWorkEthics;
        this.attendance = attendance;
        this.workplacePerformance = workplacePerformance;
        this.logbookQuality = logbookQuality;
        this.academicReport = academicReport;
        this.presentation = presentation;
        this.overallGrade = overallGrade;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public Long getPlacementId() {
        return placementId;
    }

    public void setPlacementId(Long placementId) {
        this.placementId = placementId;
    }

    public String getSupervisorType() {
        return supervisorType;
    }

    public void setSupervisorType(String supervisorType) {
        this.supervisorType = supervisorType;
    }

    public String getSupervisorUsername() {
        return supervisorUsername;
    }

    public void setSupervisorUsername(String supervisorUsername) {
        this.supervisorUsername = supervisorUsername;
    }

    public Integer getPunctuality() {
        return punctuality;
    }

    public void setPunctuality(Integer punctuality) {
        this.punctuality = punctuality;
    }

    public Integer getPracticalWorkEthics() {
        return practicalWorkEthics;
    }

    public void setPracticalWorkEthics(Integer practicalWorkEthics) {
        this.practicalWorkEthics = practicalWorkEthics;
    }

    public Integer getAttendance() {
        return attendance;
    }

    public void setAttendance(Integer attendance) {
        this.attendance = attendance;
    }

    public Integer getWorkplacePerformance() {
        return workplacePerformance;
    }

    public void setWorkplacePerformance(Integer workplacePerformance) {
        this.workplacePerformance = workplacePerformance;
    }

    public Integer getLogbookQuality() {
        return logbookQuality;
    }

    public void setLogbookQuality(Integer logbookQuality) {
        this.logbookQuality = logbookQuality;
    }

    public Integer getAcademicReport() {
        return academicReport;
    }

    public void setAcademicReport(Integer academicReport) {
        this.academicReport = academicReport;
    }

    public Integer getPresentation() {
        return presentation;
    }

    public void setPresentation(Integer presentation) {
        this.presentation = presentation;
    }

    public Integer getOverallGrade() {
        return overallGrade;
    }

    public void setOverallGrade(Integer overallGrade) {
        this.overallGrade = overallGrade;
    }
}
