package com.example.demo.academic;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRepository extends JpaRepository<Staff, Integer> {
    List<Staff> findByUniversityId(Integer universityId);

    List<Staff> findByUnitId(Integer unitId);

    List<Staff> findByRole(String role);

    List<Staff> findByFullNameContainingIgnoreCase(String name);

    List<Staff> findByUniversityIdAndRole(Integer universityId, String role);
}
