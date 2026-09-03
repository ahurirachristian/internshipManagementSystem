package com.example.demo.student;

import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(4)
public class StudentSettingDataSeeder implements CommandLineRunner {

    private final StudentSettingRepository studentSettingRepository;
    private final UserRepository userRepository;

    public StudentSettingDataSeeder(StudentSettingRepository studentSettingRepository,
            UserRepository userRepository) {
        this.studentSettingRepository = studentSettingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(user -> {
            if (studentSettingRepository.findByUsername(user.getUsername()).isEmpty()) {
                StudentSetting setting = new StudentSetting();
                setting.setUsername(user.getUsername());
                setting.setEmailNotifications(true);
                setting.setSmsNotifications(false);
                setting.setDiaryReminders(true);
                setting.setTheme("light");
                studentSettingRepository.save(setting);
            }
        });
    }
}
