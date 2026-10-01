package com.example.demo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * PC5: admin-wide counts.
 *
 * <p>Everything here is system-wide by definition, so the only guard is the
 * controller's ADMIN authority — there is no tenant to scope to. The counts are
 * aggregated in the database rather than by loading every student row, so this
 * stays cheap as rosters grow.
 */
@Service
public class AdminAnalyticsService {

    private final StudentRepository studentRepository;
    private final UniversityRepository universityRepository;

    public AdminAnalyticsService(StudentRepository studentRepository, UniversityRepository universityRepository) {
        this.studentRepository = studentRepository;
        this.universityRepository = universityRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> studentsPerUniversity() {
        Map<Long, String> namesById = new LinkedHashMap<>();
        List<University> universities = universityRepository.findAll();
        for (University university : universities) {
            namesById.put(university.getId().longValue(), university.getFullName());
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        long unattributed = 0;
        for (Object[] row : studentRepository.countGroupedByUniversity()) {
            if (!(row[0] instanceof Number idNumber)) {
                // Students with no university are not silently dropped; they become
                // their own "Unassigned" bar so the totals still reconcile.
                unattributed += ((Number) row[1]).longValue();
                continue;
            }
            Long universityId = idNumber.longValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("universityId", universityId);
            item.put("name", namesById.getOrDefault(universityId, "University " + universityId));
            item.put("count", ((Number) row[1]).longValue());
            rows.add(item);
        }

        // Largest first: the bar's question is "which university dominates".
        rows.sort(Comparator.comparingLong(r -> -((Number) r.get("count")).longValue()));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("studentsPerUniversity", rows);
        out.put("unassignedCount", unattributed);
        out.put("totalStudents", rows.stream().mapToLong(r -> ((Number) r.get("count")).longValue()).sum() + unattributed);
        return out;
    }
}
