package com.example.demo.dto;

public class StudentSettingsDto {

    private String username;
    private boolean emailNotifications;
    private boolean smsNotifications;
    private boolean diaryReminders;
    private String theme;

    public StudentSettingsDto() {
    }

    public StudentSettingsDto(String username, boolean emailNotifications, boolean smsNotifications,
            boolean diaryReminders, String theme) {
        this.username = username;
        this.emailNotifications = emailNotifications;
        this.smsNotifications = smsNotifications;
        this.diaryReminders = diaryReminders;
        this.theme = theme;
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
