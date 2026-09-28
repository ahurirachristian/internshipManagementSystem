package com.example.demo.dto;

public class StudentSettingsDto {
<<<<<<< HEAD

    private String username;
    private boolean emailNotifications;
    private boolean smsNotifications;
    private boolean diaryReminders;
    private String theme;
=======
    private Long id;
    private Boolean emailNotifications;
    private Boolean smsNotifications;
    private Boolean darkMode;
    private String language;
>>>>>>> developer

    public StudentSettingsDto() {
    }

<<<<<<< HEAD
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
=======
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
