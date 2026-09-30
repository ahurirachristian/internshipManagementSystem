package com.example.demo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppMigrationFlagRepository extends JpaRepository<AppMigrationFlag, String> {

    boolean existsByName(String name);
}
