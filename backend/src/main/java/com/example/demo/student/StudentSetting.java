package com.example.demo.student;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_settings")
public class StudentSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

<<<<<<< HEAD
    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private boolean emailNotifications = true;

    @Column(nullable = false)
    private boolean smsNotifications = false;

    @Column(nullable = false)
    private boolean diaryReminders = true;

    @Column(nullable = false)
    private String theme = "light";
=======
    @Column(name = "student_id", nullable = false, unique = true)
    private Long studentId;

    @Column(name = "email_notifications")
    private Boolean emailNotifications = Boolean.TRUE;

    @Column(name = "sms_notifications")
    private Boolean smsNotifications = Boolean.TRUE;

    @Column(name = "dark_mode")
    private Boolean darkMode = Boolean.FALSE;

    @Column(name = "language")
    private String language = "en";
>>>>>>> developer

    public StudentSetting() {
    }

<<<<<<< HEAD
    public StudentSetting(String username, boolean emailNotifications, boolean smsNotifications,
            boolean diaryReminders, String theme) {
        this.username = username;
        this.emailNotifications = emailNotifications;
        this.smsNotifications = smsNotifications;
        this.diaryReminders = diaryReminders;
        this.theme = theme;
    }

=======
>>>>>>> developer
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

<<<<<<< HEAD
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public boolean isEmailNotifications() {
        return emailNotifications;
    }

    public void setEmailNotifications(boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public boolean isSmsNotifications() {
        return smsNotifications;
    }

    public void setSmsNotifications(boolean smsNotifications) {
        this.smsNotifications = smsNotifications;
    }

    public boolean isDiaryReminders() {
        return diaryReminders;
    }

    public void setDiaryReminders(boolean diaryReminders) {
        this.diaryReminders = diaryReminders;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
=======
    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public Boolean getEmailNotifications() {
        return emailNotifications;
    }

    public void setEmailNotifications(Boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public Boolean getSmsNotifications() {
        return smsNotifications;
    }

    public void setSmsNotifications(Boolean smsNotifications) {
        this.smsNotifications = smsNotifications;
    }

    public Boolean getDarkMode() {
        return darkMode;
    }

    public void setDarkMode(Boolean darkMode) {
        this.darkMode = darkMode;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
>>>>>>> developer
    }
}
