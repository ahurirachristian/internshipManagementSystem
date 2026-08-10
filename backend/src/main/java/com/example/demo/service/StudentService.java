package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dto.StudentProfileDto;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;

@Service
@Transactional
public class StudentService {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;

    public StudentService(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
    }

    public Optional<StudentProfile> findByUsername(String username) {
        return studentProfileRepository.findByUsername(username);
    }

    public Optional<StudentProfile> findOrCreateByUsername(String username) {
        return studentProfileRepository.findByUsername(username).or(() -> {
            StudentProfile newProfile = new StudentProfile();
            newProfile.setUsername(username);
            return Optional.of(newProfile);
        });
    }

    public StudentProfileDto toDto(StudentProfile profile) {
        return new StudentProfileDto(
                profile.getId(),
                profile.getUsername(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getEmail(),
                profile.getStudentNumber(),
                profile.getRegistrationNumber(),
                profile.getDegreeProgram(),
                profile.getYearOfStudy(),
                profile.getPhoneNumber(),
                profile.getInternshipCompany(),
                profile.getUniversitySupervisor(),
                profile.getIndustrialSupervisorId(),
                profile.getCompanyId(),
                profile.getPictureUrl()
        );
    }

    public StudentProfile toEntity(StudentProfileDto dto) {
        StudentProfile profile = new StudentProfile();
        if (dto.getId() != null) {
            profile.setId(dto.getId());
        }
        profile.setUsername(dto.getUsername());
        profile.setFirstName(dto.getFirstName());
        profile.setLastName(dto.getLastName());
        profile.setEmail(dto.getEmail());
        profile.setStudentNumber(dto.getStudentNumber());
        profile.setRegistrationNumber(dto.getRegistrationNumber());
        profile.setDegreeProgram(dto.getDegreeProgram());
        profile.setYearOfStudy(dto.getYearOfStudy());
        profile.setPhoneNumber(dto.getPhoneNumber());
        profile.setInternshipCompany(dto.getInternshipCompany());
        profile.setUniversitySupervisor(dto.getUniversitySupervisor());
        profile.setIndustrialSupervisorId(dto.getIndustrialSupervisorId());
        profile.setCompanyId(dto.getCompanyId());
        profile.setPictureUrl(dto.getPictureUrl());
        return profile;
    }

    public StudentProfileDto saveProfile(StudentProfileDto dto, String username) {
        studentProfileRepository.findByUsername(username).ifPresent(existing -> dto.setId(existing.getId()));
        StudentProfile profile = toEntity(dto);
        profile.setUsername(username);
        StudentProfile saved = studentProfileRepository.save(profile);
        return toDto(saved);
    }

    public StudentProfile save(StudentProfile profile) {
        return studentProfileRepository.save(profile);
    }

    public DayDiary saveDayDiary(DayDiary diaryEntry) {
        return dayDiaryRepository.save(diaryEntry);
    }

    public List<DayDiary> findDiaryEntriesByUsername(String username) {
        return dayDiaryRepository.findByStudentProfileUsernameOrderByDateDesc(username);
    }
}