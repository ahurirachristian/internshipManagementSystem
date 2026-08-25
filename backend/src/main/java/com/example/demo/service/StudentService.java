package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.StudentProfileDto;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.student.StudentRepository;

@Service
@Transactional
public class StudentService {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;

    public StudentService(StudentProfileRepository studentProfileRepository, DayDiaryRepository dayDiaryRepository,
            UserRepository userRepository, StudentRepository studentRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
    }

    public Optional<StudentProfile> findByStudentNo(String studentNo) {
        return studentProfileRepository.findByStudentNo(studentNo);
    }

    public Optional<StudentProfile> findByEmail(String email) {
        return studentProfileRepository.findByEmail(email);
    }

    public Optional<StudentProfile> findOrCreateByStudentNo(String studentNo) {
        return studentProfileRepository.findByStudentNo(studentNo).or(() -> {
            StudentProfile newProfile = new StudentProfile();
            newProfile.setStudentNo(studentNo);
            return Optional.of(newProfile);
        });
    }

    public StudentProfileDto toDto(StudentProfile profile) {
        StudentProfileDto dto = new StudentProfileDto();
        dto.setId(profile.getId());
        dto.setStudentName(profile.getStudentName());
        dto.setStudentNo(profile.getStudentNo());
        dto.setRegNo(profile.getRegNo());
        dto.setIntake(profile.getIntake());
        dto.setProgram(profile.getProgram());
        dto.setCourseName(profile.getCourseName());
        dto.setMobileNo(profile.getMobileNo());
        dto.setEmail(profile.getEmail());
        dto.setYearOfStudy(profile.getYearOfStudy());
        dto.setAcademicYear(profile.getAcademicYear());
        dto.setSemester(profile.getSemester());
        dto.setOrganisation(profile.getOrganisation());
        dto.setLocation(profile.getLocation());
        dto.setAcademicSupervisor(profile.getAcademicSupervisor());
        dto.setAcademicSupervisorContact(profile.getAcademicSupervisorContact());
        dto.setFieldSupervisor(profile.getFieldSupervisor());
        dto.setFieldSupervisorContact(profile.getFieldSupervisorContact());
        dto.setStartDate(profile.getStartDate());
        dto.setEndDate(profile.getEndDate());
        dto.setUnitId(profile.getUnitId());
        dto.setCourseId(profile.getCourseId());
        dto.setAcademicSupervisorId(profile.getAcademicSupervisorId());
        dto.setFieldSupervisorId(profile.getFieldSupervisorId());
        return dto;
    }

    public StudentProfile toEntity(StudentProfileDto dto) {
        StudentProfile profile = new StudentProfile();
        if (dto.getId() != null) {
            profile.setId(dto.getId());
        }
        profile.setStudentName(dto.getStudentName());
        profile.setStudentNo(dto.getStudentNo());
        profile.setRegNo(dto.getRegNo());
        profile.setIntake(dto.getIntake());
        profile.setProgram(dto.getProgram());
        profile.setCourseName(dto.getCourseName());
        profile.setMobileNo(dto.getMobileNo());
        profile.setEmail(dto.getEmail());
        profile.setYearOfStudy(dto.getYearOfStudy());
        profile.setAcademicYear(dto.getAcademicYear());
        profile.setSemester(dto.getSemester());
        profile.setOrganisation(dto.getOrganisation());
        profile.setLocation(dto.getLocation());
        profile.setAcademicSupervisor(dto.getAcademicSupervisor());
        profile.setAcademicSupervisorContact(dto.getAcademicSupervisorContact());
        profile.setFieldSupervisor(dto.getFieldSupervisor());
        profile.setFieldSupervisorContact(dto.getFieldSupervisorContact());
        profile.setStartDate(dto.getStartDate());
        profile.setEndDate(dto.getEndDate());
        profile.setUnitId(dto.getUnitId());
        profile.setCourseId(dto.getCourseId());
        profile.setAcademicSupervisorId(dto.getAcademicSupervisorId());
        profile.setFieldSupervisorId(dto.getFieldSupervisorId());
        return profile;
    }

    public StudentProfileDto saveProfile(StudentProfileDto dto, String studentNo) {
        studentProfileRepository.findByStudentNo(studentNo).ifPresent(existing -> dto.setId(existing.getId()));
        StudentProfile profile = toEntity(dto);
        profile.setStudentNo(studentNo);
        StudentProfile saved = studentProfileRepository.save(profile);
        return toDto(saved);
    }

    public StudentProfile save(StudentProfile profile) {
        return studentProfileRepository.save(profile);
    }

    public DayDiary saveDayDiary(DayDiary diaryEntry) {
        return dayDiaryRepository.save(diaryEntry);
    }

    public List<DayDiary> findDiaryEntriesByStudentNo(String studentNo) {
        // M4: studentNo here carries the username; resolve the Model-B row.
        return userRepository.findByUsername(studentNo)
                .flatMap(user -> studentRepository.findByUserId(user.getId()))
                .map(student -> dayDiaryRepository.findByStudentIdOrderByDateDesc(student.getId()))
                .orElse(List.of());
    }
}
