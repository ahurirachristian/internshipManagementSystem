package com.example.demo.service;

import java.util.List;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.StudentCredentialRequest;
import com.example.demo.dto.UniversityDto;
import com.example.demo.dto.UniversityRequest;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

@Service
@Transactional
public class UniversityService {

    private static final String DEFAULT_PASSWORD = "Student@123";

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UniversityRepository universityRepository;
    private final PasswordEncoder passwordEncoder;

    public UniversityService(UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            UniversityRepository universityRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.universityRepository = universityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<University> searchByName(String query) {
        return universityRepository.findByFullNameContainingIgnoreCase(query);
    }

    public List<University> getAllUniversities() {
        return universityRepository.findAll();
    }

    public Optional<University> findById(Integer id) {
        return universityRepository.findById(id);
    }

    public University create(UniversityRequest request) {
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new IllegalArgumentException("University full name is required.");
        }
        if (request.getShortForm() == null || request.getShortForm().isBlank()) {
            throw new IllegalArgumentException("University short form is required.");
        }
        if (universityRepository.findByFullNameIgnoreCase(request.getFullName().trim()).isPresent()) {
            throw new IllegalArgumentException("A university with this full name already exists.");
        }
        if (universityRepository.findByShortFormIgnoreCase(request.getShortForm().trim()).isPresent()) {
            throw new IllegalArgumentException("A university with this short form already exists.");
        }
        University university = new University();
        university.setShortForm(request.getShortForm().trim());
        university.setFullName(request.getFullName().trim());
        university.setCountry(request.getCountry() != null ? request.getCountry().trim() : "Uganda");
        university.setEstablishedYear(request.getEstablishedYear());
        return universityRepository.save(university);
    }

    public Optional<University> update(Integer id, UniversityRequest request) {
        return universityRepository.findById(id)
                .map(existing -> {
                    if (request.getShortForm() != null && !request.getShortForm().isBlank()) {
                        existing.setShortForm(request.getShortForm().trim());
                    }
                    if (request.getFullName() != null && !request.getFullName().isBlank()) {
                        existing.setFullName(request.getFullName().trim());
                    }
                    if (request.getCountry() != null) {
                        existing.setCountry(request.getCountry().trim());
                    }
                    if (request.getEstablishedYear() != null) {
                        existing.setEstablishedYear(request.getEstablishedYear());
                    }
                    return universityRepository.save(existing);
                });
    }

    public void deleteById(Integer id) {
        universityRepository.deleteById(id);
    }

    public UniversityDto toDto(University university) {
        return new UniversityDto(university.getUniversityId(), university.getShortForm(),
                university.getFullName(), university.getCountry(), university.getEstablishedYear());
    }

    public List<StudentProfile> getRegisteredStudents() {
        return studentProfileRepository.findAll();
    }

    public List<StudentProfile> getStudentsBySupervisor(String supervisorName) {
        return studentProfileRepository.findByAcademicSupervisor(supervisorName);
    }

    public UserEntity createStudentCredential(StudentCredentialRequest request, String supervisorUsername) {
        if (request == null || request.getStudentNo() == null || request.getStudentNo().isBlank()) {
            throw new IllegalArgumentException("Student number is required.");
        }

        if (userRepository.findByUsername(request.getStudentNo()).isPresent()) {
            throw new IllegalArgumentException("A student account already exists for this student number.");
        }

        UserEntity user = new UserEntity();
        user.setUsername(request.getStudentNo());
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setRole(Role.STUDENT);
        user.setEmail(request.getEmail());
        user.setMustChangePassword(true);
        UserEntity savedUser = userRepository.save(user);

        StudentProfile profile = new StudentProfile();
        profile.setStudentName(request.getStudentName());
        profile.setStudentNo(request.getStudentNo());
        profile.setRegNo(request.getRegNo());
        profile.setIntake(request.getIntake());
        profile.setProgram(request.getProgram());
        profile.setCourseName(request.getCourseName());
        profile.setEmail(request.getEmail());
        profile.setYearOfStudy("1");
        profile.setAcademicYear("One");
        profile.setSemester("One");
        profile.setOrganisation("Pending");
        profile.setLocation("Pending");
        profile.setAcademicSupervisor(supervisorUsername);
        profile.setFieldSupervisor("Pending");
        studentProfileRepository.save(profile);

        return savedUser;
    }

    public Optional<StudentProfile> findStudentProfile(String studentNo) {
        return studentProfileRepository.findByStudentNo(studentNo);
    }
}
