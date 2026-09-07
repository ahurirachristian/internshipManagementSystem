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

    public StudentSetting() {
    }

    public StudentSetting(String username, boolean emailNotifications, boolean smsNotifications,
            boolean diaryReminders, String theme) {
        this.username = username;
        this.emailNotifications = emailNotifications;
        this.smsNotifications = smsNotifications;
        this.diaryReminders = diaryReminders;
        this.theme = theme;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
    }
}
