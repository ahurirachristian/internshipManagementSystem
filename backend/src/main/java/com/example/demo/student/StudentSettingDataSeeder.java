package com.example.demo.student;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(41)
public class StudentSettingDataSeeder implements CommandLineRunner {

    private final StudentSettingRepository studentSettingRepository;
    private final UserRepository userRepository;

    public StudentSettingDataSeeder(StudentSettingRepository studentSettingRepository, UserRepository userRepository) {
        this.studentSettingRepository = studentSettingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.STUDENT)
                .forEach(user -> {
                    if (studentSettingRepository.findByStudentId(user.getId()) == null) {
                        StudentSetting setting = new StudentSetting();
                        setting.setStudentId(user.getId());
                        setting.setEmailNotifications(Boolean.TRUE);
                        setting.setSmsNotifications(Boolean.TRUE);
                        setting.setDarkMode(Boolean.FALSE);
                        setting.setLanguage("en");
                        studentSettingRepository.save(setting);
                    }
                });
    }
}
