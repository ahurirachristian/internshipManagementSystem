package com.example.demo.academic;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Integer> {
    List<Course> findByUniversityId(Integer universityId);

    List<Course> findByCourseNameContainingIgnoreCase(String keyword);

    List<Course> findByLevel(String level);

    List<Course> findByUniversityIdAndLevel(Integer universityId, String level);
}
