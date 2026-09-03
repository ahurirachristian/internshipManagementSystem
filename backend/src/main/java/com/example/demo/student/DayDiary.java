package com.example.demo.student;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.FetchType;

@Entity
@Table(name = "day_diaries")
public class DayDiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @Column(nullable = false)
    private LocalDate date;

    @Lob
    @Column(nullable = false)
    private String dailyActivities;

    @Lob
    @Column(nullable = false)
    private String knowledgeAndSkillsGained;

    @Lob
    @Column(nullable = false)
    private String accomplishments;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(nullable = true)
    private String accountNumber;

    @Lob
    @Column(nullable = true)
    private String action;

    @Lob
    @Column(nullable = true)
    private String technologyTools;

    @Lob
    private String supervisorFeedback;

    @Lob
    @Column(nullable = true)
    private String industrialSupervisorComment;

    @Lob
    @Column(nullable = true)
    private String universitySupervisorComment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_profile_id", nullable = false)
    private StudentProfile studentProfile;

    public DayDiary() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getDailyActivities() {
        return dailyActivities;
    }

    public void setDailyActivities(String dailyActivities) {
        this.dailyActivities = dailyActivities;
    }

    public String getKnowledgeAndSkillsGained() {
        return knowledgeAndSkillsGained;
    }

    public void setKnowledgeAndSkillsGained(String knowledgeAndSkillsGained) {
        this.knowledgeAndSkillsGained = knowledgeAndSkillsGained;
    }

    public String getAccomplishments() {
        return accomplishments;
    }

    public void setAccomplishments(String accomplishments) {
        this.accomplishments = accomplishments;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSupervisorFeedback() {
        return supervisorFeedback;
    }

    public void setSupervisorFeedback(String supervisorFeedback) {
        this.supervisorFeedback = supervisorFeedback;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getTechnologyTools() {
        return technologyTools;
    }

    public void setTechnologyTools(String technologyTools) {
        this.technologyTools = technologyTools;
    }

    public String getIndustrialSupervisorComment() {
        return industrialSupervisorComment;
    }

    public void setIndustrialSupervisorComment(String industrialSupervisorComment) {
        this.industrialSupervisorComment = industrialSupervisorComment;
    }

    public String getUniversitySupervisorComment() {
        return universitySupervisorComment;
    }

    public void setUniversitySupervisorComment(String universitySupervisorComment) {
        this.universitySupervisorComment = universitySupervisorComment;
    }

    public StudentProfile getStudentProfile() {
        return studentProfile;
    }

    public void setStudentProfile(StudentProfile studentProfile) {
        this.studentProfile = studentProfile;
    }
}
