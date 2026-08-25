package com.example.demo.controller;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.company.Company;
import com.example.demo.company.CompanyRepository;
import com.example.demo.company.CompanyService;
import com.example.demo.service.StudentService;
import com.example.demo.service.UniversityService;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;
import com.example.demo.dto.StudentCredentialRequest;
import com.example.demo.student.DayDiaryRepository;
import com.example.demo.student.StudentRepository;
import com.example.demo.supervisor.UniversitySupervisorRepository;
import com.example.demo.audit.AuditLogService;

@Controller
public class DashboardController {

    private static final String STUDENT_HOME = "/student/dashboard";
    private static final String UNIVERSITY_HOME = "/university/dashboard";
    private static final String ADMIN_HOME = "/admin/dashboard";
    private static final String COMPANY_HOME = "/company/dashboard";

    private final StudentService studentService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyService companyService;
    private final StudentProfileRepository studentProfileRepository;
    private final UniversityRepository universityRepository;
    private final UniversityService universityService;
    private final DayDiaryRepository dayDiaryRepository;
    private final StudentRepository studentRepository;
    private final UniversitySupervisorRepository universitySupervisorRepository;
    private final AuditLogService auditLogService;

    public DashboardController(StudentService studentService,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            CompanyService companyService,
            StudentProfileRepository studentProfileRepository,
            UniversityRepository universityRepository,
            UniversityService universityService,
            DayDiaryRepository dayDiaryRepository,
            StudentRepository studentRepository,
            UniversitySupervisorRepository universitySupervisorRepository,
            AuditLogService auditLogService) {
        this.studentService = studentService;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.companyService = companyService;
        this.studentProfileRepository = studentProfileRepository;
        this.universityRepository = universityRepository;
        this.universityService = universityService;
        this.dayDiaryRepository = dayDiaryRepository;
        this.studentRepository = studentRepository;
        this.universitySupervisorRepository = universitySupervisorRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/dashboard")
    public String dashboard(Authentication authentication) {
        return "redirect:" + resolveHome(authentication);
    }

    @GetMapping("/student/dashboard")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'SUPERVISOR', 'ADMIN')")
    public String studentDashboard(Principal principal, Authentication authentication, Model model) {
        studentService.findByStudentNo(principal.getName())
                .ifPresent(profile -> model.addAttribute("student", profile));
        model.addAttribute("diaryEntry", new com.example.demo.student.DayDiary());
        model.addAttribute("diaryEntries", studentService.findDiaryEntriesByStudentNo(principal.getName()));
        model.addAttribute("userRole", resolveRole(authentication));
        String role = resolveRole(authentication);
        if ("STUDENT".equals(role)) {
            return "redirect:/student/details";
        }
        return "student";
    }

    @GetMapping("/supervisor/overview")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityOverview() {
        return "redirect:" + UNIVERSITY_HOME;
    }

    @GetMapping("/company/dashboard")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'ADMIN', 'SUPERVISOR')")
    public String companyDashboard(Principal principal, Authentication authentication, Model model) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Long companyId = (user != null) ? user.getCompanyId() : null;

        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId).orElse(null);
        }

        String role = resolveRole(authentication);
        model.addAttribute("userRole", role);
        model.addAttribute("company", company);
        model.addAttribute("companyId", companyId);
        model.addAttribute("students", companyService.findStudentsByCompanyId(companyId));
        model.addAttribute("activePage", "profile");

        if ("COMPANY".equals(role)) {
            return "company-dashboard";
        }
        return "company";
    }

    @GetMapping("/company/interns")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'ADMIN', 'SUPERVISOR')")
    public String companyInterns(Principal principal, Authentication authentication, Model model) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Long companyId = (user != null) ? user.getCompanyId() : null;

        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId).orElse(null);
        }

        String role = resolveRole(authentication);
        model.addAttribute("userRole", role);
        model.addAttribute("company", company);
        model.addAttribute("companyId", companyId);
        model.addAttribute("students", companyId != null ? companyService.findStudentsByCompanyId(companyId) : Collections.emptyList());
        model.addAttribute("activePage", "interns");

        if ("COMPANY".equals(role)) {
            return "company-interns";
        }
        return company != null ? "company-interns" : "company";
    }

    @GetMapping("/university/dashboard")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityDashboard(Model model, Principal principal, Authentication authentication) {
        return "redirect:/university/credentials";
    }

    @GetMapping("/university/credentials")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityCredentials(Model model, Principal principal, Authentication authentication) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Integer universityId = (user != null) ? user.getUniversityId() != null ? user.getUniversityId().intValue() : null : null;

        University university = null;
        if (universityId != null) {
            university = universityRepository.findById(universityId).orElse(null);
        }

        model.addAttribute("userRole", resolveRole(authentication));
        List<StudentProfile> students = universityService.getStudentsBySupervisor(principal.getName());
        model.addAttribute("students", students);
        // M3 (loophole #3 fix): assigned/pending now computed from the Model-B
        // students table via internship_company_id, not the "Pending" string.
        long[] bCounts = modelBAssignedPendingCounts(principal.getName());
        model.addAttribute("assignedCount", bCounts[0]);
        model.addAttribute("pendingCount", bCounts[1]);
        model.addAttribute("universities", universityService.getAllUniversities());
        model.addAttribute("university", university);
        model.addAttribute("credentialRequest", new StudentCredentialRequest());
        model.addAttribute("currentUser", principal.getName());
        model.addAttribute("activePage", "credentials");
        return "university-credentials";
    }

    @GetMapping("/university/students")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String universityStudents(Model model, Principal principal, Authentication authentication) {
        UserEntity user = userRepository.findByUsername(principal.getName()).orElse(null);
        Integer universityId = (user != null) ? user.getUniversityId() != null ? user.getUniversityId().intValue() : null : null;

        University university = null;
        if (universityId != null) {
            university = universityRepository.findById(universityId).orElse(null);
        }

        model.addAttribute("userRole", resolveRole(authentication));
        model.addAttribute("students", universityService.getStudentsBySupervisor(principal.getName()));
        model.addAttribute("universities", universityService.getAllUniversities());
        model.addAttribute("university", university);
        model.addAttribute("currentUser", principal.getName());
        model.addAttribute("activePage", "students");
        return "university-students";
    }

    @PostMapping("/university/students/credential")
    @PreAuthorize("hasAnyAuthority('SUPERVISOR', 'ADMIN')")
    public String createStudentCredential(@ModelAttribute("credentialRequest") StudentCredentialRequest request,
            Principal principal, Model model, Authentication authentication, RedirectAttributes redirectAttributes) {
        try {
            universityService.createStudentCredential(request, principal.getName());
            auditLogService.log(principal.getName(), "SUPERVISOR", "CREATE", "StudentCredential", "Created credentials for: " + request.getStudentName() + " (" + request.getStudentNo() + ")", null);
            redirectAttributes.addFlashAttribute("successMessage", "Student credentials created successfully.");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/university/dashboard";
    }

    @GetMapping("/students/edit/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String showEditStudentForm(@PathVariable Long id, Principal principal, Authentication authentication,
            Model model, RedirectAttributes redirectAttributes) {
        return studentProfileRepository.findById(id)
                .map(student -> {
                    model.addAttribute("userRole", resolveRole(authentication));
                    model.addAttribute("student", student);
                    model.addAttribute("backUrl", resolveBackUrl(authentication));
                    return "student-edit";
                })
                .orElseGet(() -> {
                    redirectAttributes.addFlashAttribute("errorMessage", "Student not found.");
                    return "redirect:" + resolveHome(authentication);
                });
    }

    @PutMapping("/students/edit/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String updateStudent(@PathVariable Long id, @ModelAttribute("student") StudentProfile formData,
            Authentication authentication, RedirectAttributes redirectAttributes) {
        return studentProfileRepository.findById(id)
                .map(existing -> {
                    existing.setStudentName(formData.getStudentName());
                    existing.setStudentNo(formData.getStudentNo());
                    existing.setRegNo(formData.getRegNo());
                    existing.setIntake(formData.getIntake());
                    existing.setProgram(formData.getProgram());
                    existing.setCourseName(formData.getCourseName());
                    existing.setMobileNo(formData.getMobileNo());
                    existing.setEmail(formData.getEmail());
                    existing.setYearOfStudy(formData.getYearOfStudy());
                    existing.setAcademicYear(formData.getAcademicYear());
                    existing.setSemester(formData.getSemester());
                    existing.setOrganisation(formData.getOrganisation());
                    existing.setLocation(formData.getLocation());
                    existing.setAcademicSupervisor(formData.getAcademicSupervisor());
                    existing.setFieldSupervisor(formData.getFieldSupervisor());
                    existing.setStartDate(formData.getStartDate());
                    existing.setEndDate(formData.getEndDate());
                    existing.setUnitId(formData.getUnitId());
                    existing.setCourseId(formData.getCourseId());
                    existing.setAcademicSupervisorId(formData.getAcademicSupervisorId());
                    existing.setFieldSupervisorId(formData.getFieldSupervisorId());
                    studentProfileRepository.save(existing);
                    redirectAttributes.addFlashAttribute("successMessage", "Student \"" + existing.getStudentName() + "\" updated successfully.");
                    return "redirect:" + resolveHome(authentication);
                })
                .orElseGet(() -> {
                    redirectAttributes.addFlashAttribute("errorMessage", "Student not found.");
                    return "redirect:" + resolveHome(authentication);
                });
    }

    @DeleteMapping("/students/delete/{id}")
    @PreAuthorize("hasAnyAuthority('COMPANY', 'SUPERVISOR', 'ADMIN')")
    public String deleteStudent(@PathVariable Long id, Authentication authentication,
            RedirectAttributes redirectAttributes) {
        studentProfileRepository.findById(id)
                .ifPresent(student -> {
                    redirectAttributes.addFlashAttribute(
                            "successMessage", "Student \"" + student.getStudentName() + "\" deleted successfully.");
                    // M4: diaries are keyed to Model-B students.id — cascade
                    // through the student-number bridge until M6c removes this
                    // Model-A flow entirely.
                    studentRepository.findByStudentNumber(student.getStudentNo()).ifPresent(modelB ->
                            dayDiaryRepository.deleteAll(
                                    dayDiaryRepository.findByStudentIdOrderByDateDesc(modelB.getId())));
                });
        studentProfileRepository.deleteById(id);
        return "redirect:" + resolveHome(authentication);
    }

    /**
     * M3: assigned = Model-B student with an internship company;
     * pending = no company yet. Supervisor scope via university_supervisors.
     */
    private long[] modelBAssignedPendingCounts(String username) {
        return userRepository.findByUsername(username)
                .flatMap(user -> universitySupervisorRepository.findByUserId(user.getId()))
                .map(supervisor -> {
                    List<com.example.demo.student.Student> scoped =
                            studentRepository.findByUniSupervisorId(supervisor.getId());
                    long assigned = scoped.stream()
                            .filter(s -> s.getInternshipCompanyId() != null).count();
                    return new long[]{assigned, scoped.size() - assigned};
                })
                .orElseGet(() -> {
                    List<com.example.demo.student.Student> all = studentRepository.findAll();
                    long assigned = all.stream()
                            .filter(s -> s.getInternshipCompanyId() != null).count();
                    return new long[]{assigned, all.size() - assigned};
                });
    }

    private String resolveBackUrl(Authentication authentication) {
        String role = resolveRole(authentication);
        if ("COMPANY".equals(role)) return COMPANY_HOME;
        if ("SUPERVISOR".equals(role)) return UNIVERSITY_HOME;
        return ADMIN_HOME;
    }

    private String resolveHome(Authentication authentication) {
        String role = resolveRole(authentication);
        if ("ADMIN".equals(role)) return ADMIN_HOME;
        if ("SUPERVISOR".equals(role)) return UNIVERSITY_HOME;
        if ("COMPANY".equals(role)) return COMPANY_HOME;
        return STUDENT_HOME;
    }

    private String resolveRole(Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            return userRepository.findByUsername(authentication.getName())
                    .map(u -> u.getRole().name())
                    .orElse("STUDENT");
        }
        return "STUDENT";
    }
}
