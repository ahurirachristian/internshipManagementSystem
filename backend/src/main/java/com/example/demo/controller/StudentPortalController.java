package com.example.demo.controller;

import java.security.Principal;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.InternshipCompany;
import com.example.demo.company.InternshipCompanyRepository;
import com.example.demo.dto.CompanyDetailsDto;
import com.example.demo.dto.IndustrialSupervisorDto;
import com.example.demo.dto.LearningInstituteDto;
import com.example.demo.dto.StudentSettingsDto;
import com.example.demo.dto.UniversitySupervisorDto;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.student.StudentSetting;
import com.example.demo.student.StudentSettingRepository;
import com.example.demo.supervisor.IndustrialSupervisor;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * Student self-service portal endpoints ("/api/students/me/*") backed by the
 * Model-B tables (MIGRATION_PLAN.md R1/R2). These replaced the Model-A
 * StudentProfile-based variants that were lost in the PR #25 merge; the React
 * student pages (learning institute, company, supervisors, settings) depend on
 * them.
 */
@RestController
@RequestMapping("/api/students")
public class StudentPortalController {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final UniversityRepository universityRepository;
    private final InternshipCompanyRepository internshipCompanyRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final StudentSettingRepository studentSettingRepository;

    public StudentPortalController(UserRepository userRepository,
            StudentRepository studentRepository,
            UniversityRepository universityRepository,
            InternshipCompanyRepository internshipCompanyRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            StudentSettingRepository studentSettingRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.universityRepository = universityRepository;
        this.internshipCompanyRepository = internshipCompanyRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.studentSettingRepository = studentSettingRepository;
    }

    @GetMapping("/me/learning-institute")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<LearningInstituteDto> getMyLearningInstitute(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getUniversityId() == null) {
            return ResponseEntity.noContent().build();
        }
        University university = universityRepository.findById(student.getUniversityId()).orElse(null);
        if (university == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(new LearningInstituteDto(
                university.getUniversityId(),
                university.getFullName(),
                university.getShortForm(),
                null,
                university.getCountry()));
    }

    @GetMapping("/me/company")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<CompanyDetailsDto> getMyCompany(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getInternshipCompanyId() == null) {
            return ResponseEntity.noContent().build();
        }
        InternshipCompany company = internshipCompanyRepository
                .findById(student.getInternshipCompanyId()).orElse(null);
        if (company == null) {
            return ResponseEntity.noContent().build();
        }
        String location = company.getPhysicalAddress() != null
                ? company.getPhysicalAddress() : company.getPostalAddress();
        return ResponseEntity.ok(new CompanyDetailsDto(
                company.getId(),
                company.getCompanyName(),
                location,
                company.getEmail(),
                null,
                company.getWebsite(),
                null,
                company.getBranch(),
                null,
                null));
    }

    @GetMapping("/me/industrial-supervisor")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<IndustrialSupervisorDto> getMyIndustrialSupervisor(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getIndSupervisorId() == null) {
            return ResponseEntity.noContent().build();
        }
        IndustrialSupervisor supervisor = industrialSupervisorRepository
                .findById(student.getIndSupervisorId()).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.noContent().build();
        }
        String companyName = null;
        if (supervisor.getCompanyId() != null) {
            companyName = internshipCompanyRepository.findById(supervisor.getCompanyId())
                    .map(InternshipCompany::getCompanyName)
                    .orElse(null);
        }
        return ResponseEntity.ok(new IndustrialSupervisorDto(
                supervisor.getId(), supervisor.getUserId(), supervisor.getCompanyId(),
                supervisor.getFirstName(), supervisor.getLastName(), supervisor.getJobTitle(),
                supervisor.getDepartment(), supervisor.getPhoneNumber(), companyName));
    }

    @GetMapping("/me/university-supervisor")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<UniversitySupervisorDto> getMyUniversitySupervisor(Principal principal) {
        Student student = currentStudent(principal);
        if (student == null || student.getUniSupervisorId() == null) {
            return ResponseEntity.noContent().build();
        }
        UniversitySupervisor supervisor = universitySupervisorRepository
                .findById(student.getUniSupervisorId()).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.noContent().build();
        }
        String universityName = null;
        if (supervisor.getUniversityId() != null) {
            universityName = universityRepository.findById(supervisor.getUniversityId())
                    .map(University::getFullName)
                    .orElse(null);
        }
        return ResponseEntity.ok(new UniversitySupervisorDto(
                supervisor.getId(), supervisor.getUserId(), supervisor.getUniversityId(),
                supervisor.getFirstName(), supervisor.getLastName(), supervisor.getDepartment(),
                supervisor.getPhoneNumber(), universityName));
    }

    @GetMapping("/me/settings")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentSettingsDto> getMySettings(Principal principal) {
        StudentSetting setting = studentSettingRepository.findByUsername(principal.getName())
                .orElse(null);
        if (setting == null) {
            return ResponseEntity.ok(new StudentSettingsDto(principal.getName(), true, false, true, "light"));
        }
        return ResponseEntity.ok(toSettingsDto(setting));
    }

    @PutMapping("/me/settings")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentSettingsDto> updateMySettings(@RequestBody StudentSettingsDto dto,
            Principal principal) {
        StudentSetting setting = studentSettingRepository.findByUsername(principal.getName())
                .orElseGet(() -> {
                    StudentSetting s = new StudentSetting();
                    s.setUsername(principal.getName());
                    return s;
                });
        setting.setEmailNotifications(dto.isEmailNotifications());
        setting.setSmsNotifications(dto.isSmsNotifications());
        setting.setDiaryReminders(dto.isDiaryReminders());
        if (dto.getTheme() != null) {
            setting.setTheme(dto.getTheme());
        }
        return ResponseEntity.ok(toSettingsDto(studentSettingRepository.save(setting)));
    }

    private StudentSettingsDto toSettingsDto(StudentSetting setting) {
        return new StudentSettingsDto(
                setting.getUsername(), setting.isEmailNotifications(),
                setting.isSmsNotifications(), setting.isDiaryReminders(), setting.getTheme());
    }

    private Student currentStudent(Principal principal) {
        if (principal == null) {
            return null;
        }
        Optional<UserEntity> user = userRepository.findByUsername(principal.getName());
        return user.flatMap(u -> studentRepository.findByUserId(u.getId())).orElse(null);
    }
}
