package com.example.demo.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.dto.CompanyDetailsDto;
import com.example.demo.dto.IndustrialSupervisorDto;
import com.example.demo.dto.LearningInstituteDto;
import com.example.demo.dto.StudentProfileDto;
import com.example.demo.dto.StudentSettingsDto;
import com.example.demo.dto.UniversitySupervisorDto;
import com.example.demo.student.DayDiary;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.student.StudentSetting;
import com.example.demo.student.StudentSettingRepository;
import com.example.demo.supervisor.IndustrialSupervisor;
import com.example.demo.supervisor.IndustrialSupervisorRepository;
import com.example.demo.supervisor.UniversitySupervisor;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentProfileRepository studentProfileRepository;
    private final DayDiaryRepository dayDiaryRepository;
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final CompanyRepository companyRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final IndustrialSupervisorRepository industrialSupervisorRepository;
    private final StudentSettingRepository studentSettingRepository;

    public StudentController(StudentProfileRepository studentProfileRepository,
            DayDiaryRepository dayDiaryRepository,
            UserRepository userRepository,
            UniversityRepository universityRepository,
            CompanyRepository companyRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            IndustrialSupervisorRepository industrialSupervisorRepository,
            StudentSettingRepository studentSettingRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.dayDiaryRepository = dayDiaryRepository;
        this.userRepository = userRepository;
        this.universityRepository = universityRepository;
        this.companyRepository = companyRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.industrialSupervisorRepository = industrialSupervisorRepository;
        this.studentSettingRepository = studentSettingRepository;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> getMyProfile(Principal principal) {
        return studentProfileRepository.findByUsername(principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/progress")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMyProgress(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        long diaryCount = dayDiaryRepository.findByStudentProfileUsernameOrderByDateDesc(principal.getName()).size();
        Map<String, Object> progress = Map.of(
                "startDate", profile.getInternshipCompany() != null && !profile.getInternshipCompany().equals("Pending"),
                "diaryCount", diaryCount,
                "midTerm", diaryCount >= 5,
                "finalReport", diaryCount >= 10
        );
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/me/learning-institute")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<LearningInstituteDto> getMyLearningInstitute(Principal principal) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user == null || user.getUniversityId() == null) {
            StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
            if (profile != null && profile.getUniversitySupervisor() != null && !profile.getUniversitySupervisor().isBlank()) {
                UserEntity supervisorUser = userRepository.findByUsername(profile.getUniversitySupervisor()).orElse(null);
                if (supervisorUser != null && supervisorUser.getUniversityId() != null) {
                    University university = universityRepository.findById(supervisorUser.getUniversityId()).orElse(null);
                    if (university != null) {
                        return ResponseEntity.ok(new LearningInstituteDto(
                                university.getUniversityId(), university.getName(), university.getCode(),
                                university.getEmail(), university.getLocation()));
                    }
                }
            }
            return ResponseEntity.noContent().build();
        }
        University university = universityRepository.findById(user.getUniversityId()).orElse(null);
        if (university == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(new LearningInstituteDto(
                university.getUniversityId(), university.getName(), university.getCode(),
                university.getEmail(), university.getLocation()));
    }

    @GetMapping("/me/company")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<CompanyDetailsDto> getMyCompany(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (profile == null || profile.getCompanyId() == null || profile.getCompanyId().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        try {
            Long companyId = Long.valueOf(profile.getCompanyId());
            Company company = companyRepository.findById(companyId).orElse(null);
            if (company == null) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(new CompanyDetailsDto(
                    company.getId(), company.getName(), company.getLocation(), company.getEmail(),
                    company.getPhone(), company.getWebsite(), company.getProfile(),
                    company.getDepartment(), company.getFieldSupervisor(), company.getRoles()));
        } catch (NumberFormatException ex) {
            return ResponseEntity.noContent().build();
        }
    }

    @GetMapping("/me/industrial-supervisor")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<IndustrialSupervisorDto> getMyIndustrialSupervisor(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (profile == null || profile.getIndustrialSupervisorId() == null || profile.getIndustrialSupervisorId().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        List<IndustrialSupervisor> supervisors = industrialSupervisorRepository.findAll();
        IndustrialSupervisor supervisor = supervisors.stream()
                .filter(s -> profile.getIndustrialSupervisorId().equals(String.valueOf(s.getUserId())))
                .findFirst()
                .orElse(null);
        if (supervisor == null) {
            return ResponseEntity.noContent().build();
        }
        String companyName = null;
        if (supervisor.getCompanyId() != null) {
            Company company = companyRepository.findById(supervisor.getCompanyId()).orElse(null);
            if (company != null) {
                companyName = company.getName();
            }
        }
        return ResponseEntity.ok(new IndustrialSupervisorDto(
                supervisor.getId(), supervisor.getUserId(), supervisor.getCompanyId(),
                supervisor.getFirstName(), supervisor.getLastName(), supervisor.getJobTitle(),
                supervisor.getDepartment(), supervisor.getPhoneNumber(), companyName));
    }

    @GetMapping("/me/university-supervisor")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<UniversitySupervisorDto> getMyUniversitySupervisor(Principal principal) {
        StudentProfile profile = studentProfileRepository.findByUsername(principal.getName()).orElse(null);
        if (profile == null || profile.getUniversitySupervisor() == null || profile.getUniversitySupervisor().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        UserEntity supervisorUser = userRepository.findByUsername(profile.getUniversitySupervisor()).orElse(null);
        if (supervisorUser == null) {
            return ResponseEntity.noContent().build();
        }
        UniversitySupervisor supervisor = universitySupervisorRepository.findAll().stream()
                .filter(s -> s.getUserId().equals(supervisorUser.getId()))
                .findFirst()
                .orElse(null);
        if (supervisor == null) {
            return ResponseEntity.noContent().build();
        }
        String universityName = null;
        if (supervisor.getUniversityId() != null) {
            University university = universityRepository.findById(supervisor.getUniversityId()).orElse(null);
            if (university != null) {
                universityName = university.getName();
            }
        }
        return ResponseEntity.ok(new UniversitySupervisorDto(
                supervisor.getId(), supervisor.getUserId(), supervisor.getUniversityId(),
                supervisor.getFirstName(), supervisor.getLastName(), supervisor.getDepartment(),
                supervisor.getPhoneNumber(), universityName));
    }

    @GetMapping("/me/settings")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentSettingsDto> getMySettings(Principal principal) {
        StudentSetting setting = studentSettingRepository.findByUsername(principal.getName()).orElse(null);
        if (setting == null) {
            StudentSetting defaults = new StudentSetting();
            defaults.setUsername(principal.getName());
            defaults.setEmailNotifications(true);
            defaults.setSmsNotifications(false);
            defaults.setDiaryReminders(true);
            defaults.setTheme("light");
            return ResponseEntity.ok(new StudentSettingsDto(
                    defaults.getUsername(), defaults.isEmailNotifications(),
                    defaults.isSmsNotifications(), defaults.isDiaryReminders(), defaults.getTheme()));
        }
        return ResponseEntity.ok(new StudentSettingsDto(
                setting.getUsername(), setting.isEmailNotifications(),
                setting.isSmsNotifications(), setting.isDiaryReminders(), setting.getTheme()));
    }

    @PutMapping("/me/settings")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentSettingsDto> updateMySettings(@RequestBody StudentSettingsDto dto, Principal principal) {
        StudentSetting setting = studentSettingRepository.findByUsername(principal.getName()).orElseGet(() -> {
            StudentSetting s = new StudentSetting();
            s.setUsername(principal.getName());
            return s;
        });
        setting.setEmailNotifications(dto.isEmailNotifications());
        setting.setSmsNotifications(dto.isSmsNotifications());
        setting.setDiaryReminders(dto.isDiaryReminders());
        setting.setTheme(dto.getTheme() != null ? dto.getTheme() : "light");
        StudentSetting saved = studentSettingRepository.save(setting);
        return ResponseEntity.ok(new StudentSettingsDto(
                saved.getUsername(), saved.isEmailNotifications(),
                saved.isSmsNotifications(), saved.isDiaryReminders(), saved.getTheme()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'ADMIN')")
    public ResponseEntity<StudentProfile> updateMyProfile(@RequestBody StudentProfileDto dto, Principal principal) {
        StudentProfile existing = studentProfileRepository.findByUsername(principal.getName())
                .orElseGet(() -> {
                    StudentProfile blank = new StudentProfile();
                    blank.setUsername(principal.getName());
                    blank.setFirstName("Student");
                    blank.setLastName("User");
                    blank.setEmail(principal.getName());
                    blank.setStudentNumber(principal.getName());
                    blank.setRegistrationNumber(principal.getName());
                    blank.setDegreeProgram("Pending");
                    blank.setYearOfStudy(1);
                    blank.setPhoneNumber("Pending");
                    blank.setInternshipCompany("Pending");
                    blank.setUniversitySupervisor("Pending");
                    blank.setIndustrialSupervisorId("Pending");
                    blank.setCompanyId(null);
                    blank.setPictureUrl("/images/student-placeholder.png");
                    return blank;
                });
        merge(existing, dto);
        return ResponseEntity.ok(studentProfileRepository.save(existing));
    }

    private void merge(StudentProfile existing, StudentProfileDto dto) {
        if (dto == null) {
            return;
        }
        if (dto.getFirstName() != null) {
            existing.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null) {
            existing.setLastName(dto.getLastName());
        }
        if (dto.getEmail() != null) {
            existing.setEmail(dto.getEmail());
        }
        if (dto.getStudentNumber() != null) {
            existing.setStudentNumber(dto.getStudentNumber());
        }
        if (dto.getRegistrationNumber() != null) {
            existing.setRegistrationNumber(dto.getRegistrationNumber());
        }
        if (dto.getDegreeProgram() != null) {
            existing.setDegreeProgram(dto.getDegreeProgram());
        }
        if (dto.getYearOfStudy() != null) {
            existing.setYearOfStudy(dto.getYearOfStudy());
        }
        if (dto.getPhoneNumber() != null) {
            existing.setPhoneNumber(dto.getPhoneNumber());
        }
        if (dto.getInternshipCompany() != null) {
            existing.setInternshipCompany(dto.getInternshipCompany());
        }
        if (dto.getUniversitySupervisor() != null) {
            existing.setUniversitySupervisor(dto.getUniversitySupervisor());
        }
        if (dto.getIndustrialSupervisorId() != null) {
            existing.setIndustrialSupervisorId(dto.getIndustrialSupervisorId());
        }
        if (dto.getCompanyId() != null) {
            existing.setCompanyId(dto.getCompanyId());
        }
        if (dto.getPictureUrl() != null) {
            existing.setPictureUrl(dto.getPictureUrl());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public Page<StudentProfile> getAllStudents(@PageableDefault(size = 20) Pageable pageable) {
        return studentProfileRepository.findAll(pageable);
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<String> exportStudentsCsv() {
        List<StudentProfile> students = studentProfileRepository.findAll();
        String csv = students.stream()
                .map(s -> String.join(",",
                        escape(s.getId()),
                        escape(s.getUsername()),
                        escape(s.getFirstName()),
                        escape(s.getLastName()),
                        escape(s.getEmail()),
                        escape(s.getStudentNumber()),
                        escape(s.getRegistrationNumber()),
                        escape(s.getDegreeProgram()),
                        escape(s.getYearOfStudy()),
                        escape(s.getPhoneNumber()),
                        escape(s.getInternshipCompany()),
                        escape(s.getUniversitySupervisor()),
                        escape(s.getCompanyId())))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        String body = "ID,Username,FirstName,LastName,Email,StudentNumber,RegistrationNumber,DegreeProgram,YearOfStudy,PhoneNumber,InternshipCompany,UniversitySupervisor,CompanyId\n" + csv;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"students.csv\"")
                .body(body);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY', 'STUDENT')")
    public ResponseEntity<StudentProfile> getStudentById(@PathVariable Long id) {
        return studentProfileRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public List<StudentProfile> getStudentsByCompany(@PathVariable String companyId) {
        return studentProfileRepository.findByCompanyId(companyId);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public Page<StudentProfile> searchStudents(@RequestParam String q, @PageableDefault(size = 20) Pageable pageable) {
        return studentProfileRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(q, q, pageable);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<StudentProfile> updateStudent(@PathVariable Long id, @RequestBody StudentProfile student) {
        return studentProfileRepository.findById(id)
                .map(existing -> {
                    existing.setFirstName(student.getFirstName());
                    existing.setLastName(student.getLastName());
                    existing.setEmail(student.getEmail());
                    existing.setStudentNumber(student.getStudentNumber());
                    existing.setRegistrationNumber(student.getRegistrationNumber());
                    existing.setDegreeProgram(student.getDegreeProgram());
                    existing.setYearOfStudy(student.getYearOfStudy());
                    existing.setPhoneNumber(student.getPhoneNumber());
                    existing.setInternshipCompany(student.getInternshipCompany());
                    existing.setUniversitySupervisor(student.getUniversitySupervisor());
                    existing.setIndustrialSupervisorId(student.getIndustrialSupervisorId());
                    existing.setCompanyId(student.getCompanyId());
                    existing.setPictureUrl(student.getPictureUrl());
                    return ResponseEntity.ok(studentProfileRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        if (studentProfileRepository.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dayDiaryRepository.findAll().stream()
                .filter(diary -> diary.getStudentProfile() != null
                        && diary.getStudentProfile().getId().equals(id))
                .forEach(dayDiaryRepository::delete);
        studentProfileRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private String escape(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = s.replace("\"", "\"\"");
            return "\"" + s + "\"";
        }
        return s;
    }
}
