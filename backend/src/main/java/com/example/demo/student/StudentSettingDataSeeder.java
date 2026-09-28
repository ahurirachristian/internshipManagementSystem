package com.example.demo.student;

import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
<<<<<<< HEAD
@Order(4)
=======
@Order(33)
>>>>>>> developer
public class StudentSettingDataSeeder implements CommandLineRunner {

    private final StudentSettingRepository studentSettingRepository;
    private final UserRepository userRepository;

<<<<<<< HEAD
    public StudentSettingDataSeeder(StudentSettingRepository studentSettingRepository,
            UserRepository userRepository) {
=======
    public StudentSettingDataSeeder(StudentSettingRepository studentSettingRepository, UserRepository userRepository) {
>>>>>>> developer
        this.studentSettingRepository = studentSettingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(user -> {
<<<<<<< HEAD
            if (studentSettingRepository.findByUsername(user.getUsername()).isEmpty()) {
                StudentSetting setting = new StudentSetting();
                setting.setUsername(user.getUsername());
                setting.setEmailNotifications(true);
                setting.setSmsNotifications(false);
                setting.setDiaryReminders(true);
                setting.setTheme("light");
=======
            if (studentSettingRepository.findByStudentId(user.getId()) == null) {
                StudentSetting setting = new StudentSetting();
                setting.setStudentId(user.getId());
                setting.setEmailNotifications(Boolean.TRUE);
                setting.setSmsNotifications(Boolean.TRUE);
                setting.setDarkMode(Boolean.FALSE);
                setting.setLanguage("en");
>>>>>>> developer
                studentSettingRepository.save(setting);
            }
        });
    }
}
