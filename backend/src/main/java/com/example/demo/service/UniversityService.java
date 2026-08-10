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
        return universityRepository.findByNameStartingWithIgnoreCase(query);
    }

    public UniversityDto toDto(University university) {
        return new UniversityDto(university.getId(), university.getName());
    }

    public List<StudentProfile> getRegisteredStudents() {
        return studentProfileRepository.findAll();
    }

    public List<StudentProfile> getStudentsBySupervisor(String supervisorUsername) {
        return studentProfileRepository.findByUniversitySupervisor(supervisorUsername);
    }

    public List<University> getUniversities() {
        return universityRepository.findAll();
    }

    public UserEntity createStudentCredential(StudentCredentialRequest request, String supervisorUsername) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Student email is required.");
        }

        if (userRepository.findByUsername(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("A student account already exists for this email.");
        }

        String[] parts = request.getFullName().trim().split("\\s+");
        String firstName = parts.length > 0 ? parts[0] : "Student";
        String lastName = parts.length > 1 ? parts[1] : "User";

        UserEntity user = new UserEntity();
        user.setUsername(request.getEmail());
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setRole(Role.STUDENT);
        UserEntity savedUser = userRepository.save(user);

        StudentProfile profile = new StudentProfile();
        profile.setUsername(request.getEmail());
        profile.setFirstName(firstName);
        profile.setLastName(lastName);
        profile.setEmail(request.getEmail());
        profile.setStudentNumber(request.getStudentId());
        profile.setRegistrationNumber(request.getStudentId());
        profile.setDegreeProgram(request.getDepartment());
        profile.setYearOfStudy(3);
        profile.setPhoneNumber("Pending");
        profile.setInternshipCompany("Pending");
        profile.setUniversitySupervisor(supervisorUsername);
        profile.setIndustrialSupervisorId("Pending");
        profile.setCompanyId("Pending");
        profile.setPictureUrl("/images/default-profile.png");
        studentProfileRepository.save(profile);

        return savedUser;
    }

    public Optional<StudentProfile> findStudentProfile(String email) {
        return studentProfileRepository.findByUsername(email);
    }
}
