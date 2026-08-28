package com.example.demo.programme;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProgrammeRepository extends JpaRepository<Programme, Integer> {
    List<Programme> findBySchoolId(Integer schoolId);
    List<Programme> findByDepartmentId(Integer departmentId);
    List<Programme> findByUniversityId(Integer universityId);
}
