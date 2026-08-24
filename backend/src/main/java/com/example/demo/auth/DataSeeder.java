package com.example.demo.auth;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.auth.Role;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository repository;

    public DataSeeder(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            java.util.List<UserEntity> list = new java.util.ArrayList<>();
            UserEntity e;
            e = new UserEntity();
            e.setPassword("$2a$10$trQQpptnKtF3rxW8wP7LVOqw9KsDAADwFZG3GWJyx5VX8TlnQs7Gq");
            e.setRole(Role.valueOf("STUDENT"));
            e.setUsername("student");
            list.add(e);
            e = new UserEntity();
            e.setPassword("$2a$10$Vuv4rgrMZiO4ykJI0qje3O0/R/.D1cJJsbBO33KMXGYytaXIE96rS");
            e.setRole(Role.valueOf("SUPERVISOR"));
            e.setUsername("supervisor");
            list.add(e);
            e = new UserEntity();
            e.setPassword("$2a$10$WbXG6rnem.o0nPwK3xMLnenAi5aal1RorUWrmNdDfE9pPGm8qwuN6");
            e.setRole(Role.valueOf("ADMIN"));
            e.setUsername("admin");
            list.add(e);
            e = new UserEntity();
            e.setPassword("$2a$10$i7bixmt6SN5YEqPcgQu0.O.G91s9N1paVpVx4dITivORrY/kWPQgi");
            e.setRole(Role.valueOf("SUPERVISOR"));
            e.setUsername("university");
            e.setUniversityId(1L);
            list.add(e);
            e = new UserEntity();
            e.setPassword("$2a$10$PK.b53RyUKTDj6srz48FvuvUHzcW01phwzRMz.Rc4s8yttWcR0pRS");
            e.setRole(Role.valueOf("COMPANY"));
            e.setUsername("airtel");
            e.setCompanyId(1L);
            list.add(e);
            repository.saveAll(list);
        }
    }
}
