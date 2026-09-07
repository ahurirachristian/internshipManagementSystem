package com.example.demo.role;

import com.example.demo.role.Role;
import com.example.demo.role.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(22)
public class RoleDataSeeder implements CommandLineRunner {

    private final RoleRepository repository;

    public RoleDataSeeder(RoleRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            java.util.List<Role> list = new java.util.ArrayList<>();
            Role e;
            e = new Role();
            e.setName("ROLE_STUDENT");
            e.setDescription("Student pursuing internship");
            list.add(e);
            e = new Role();
            e.setName("ROLE_UNI_SUPERVISOR");
            e.setDescription("Academic supervisor from university");
            list.add(e);
            e = new Role();
            e.setName("ROLE_IND_SUPERVISOR");
            e.setDescription("Industry supervisor at host company");
            list.add(e);
            e = new Role();
            e.setName("ROLE_ADMIN");
            e.setDescription("System administrator");
            list.add(e);
            repository.saveAll(list);
        }
    }
}
