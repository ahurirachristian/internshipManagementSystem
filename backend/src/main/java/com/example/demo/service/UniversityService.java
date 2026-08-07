package com.example.demo.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.example.demo.dto.UniversityDto;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

@Service
public class UniversityService {

    private final UniversityRepository universityRepository;

    public UniversityService(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    public List<University> searchByName(String query) {
        return universityRepository.findByNameStartingWithIgnoreCase(query);
    }

    public UniversityDto toDto(University university) {
        return new UniversityDto(university.getId(), university.getName());
    }
}