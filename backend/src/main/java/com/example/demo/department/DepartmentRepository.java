package com.example.demo.department;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    List<Department> findBySchoolId(Integer schoolId);
    List<Department> findByUniversityId(Integer universityId);
}
