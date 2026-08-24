package com.example.demo.academic;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnitCourseRepository extends JpaRepository<UnitCourse, Integer> {
    List<UnitCourse> findByUnitId(Integer unitId);

    List<UnitCourse> findByCourseId(Integer courseId);

    Optional<UnitCourse> findByUnitIdAndCourseId(Integer unitId, Integer courseId);

    void deleteByUnitId(Integer unitId);

    void deleteByCourseId(Integer courseId);
}
