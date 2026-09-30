package com.example.demo.course;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.placement.StudentLookupDto;
import com.example.demo.placement.StudentLookupService;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;

/**
 * P8 gate (R8): course units CRUD scoped to the supervisor's university
 * (L7), plus the lookup payload gains the student's units for their year.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CourseCrudTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentLookupService lookupService;

    private String suffix() {
        return Long.toString(System.nanoTime());
    }

    private Long uniA() {
        return userRepository.findByUsername("university").orElseThrow().getUniversityId();
    }

    private Long uniB() {
        return userRepository.findByUsername("kyu").orElseThrow().getUniversityId();
    }

    private RequestPostProcessor asSupervisorOf(Long universityId) {
        String username = "coursesup" + suffix();
        UserEntity supervisor = new UserEntity(username, "hash", Role.SUPERVISOR);
        supervisor.setUniversityId(universityId);
        supervisor.setMustChangePassword(false);
        userRepository.save(supervisor);
        return user(username).authorities(new SimpleGrantedAuthority("SUPERVISOR"));
    }

    private RequestPostProcessor asAdmin() {
        String username = "courseadmin" + suffix();
        UserEntity admin = new UserEntity(username, "hash", Role.ADMIN);
        admin.setMustChangePassword(false);
        userRepository.save(admin);
        return user(username).authorities(new SimpleGrantedAuthority("ADMIN"));
    }

    private Long createCourse(Long universityId, String code) {
        Course course = new Course(universityId, 2019L, 1, code, "Test Course " + code);
        return courseRepository.save(course).getId();
    }

    private Long createCourseViaApi(RequestPostProcessor actor, Long universityId, String code) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/courses").with(actor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityId\":" + universityId + ",\"programmeId\":2019,"
                                + "\"yearOfStudy\":1,\"courseCode\":\"" + code + "\","
                                + "\"courseName\":\"Piped Course\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Matcher matcher = Pattern.compile("\"id\":(\\d+)").matcher(result.getResponse().getContentAsString());
        assertThat(matcher.find()).isTrue();
        return Long.parseLong(matcher.group(1));
    }

    @Test
    void supervisorCreatesCourseForcedToOwnUniversity() throws Exception {
        Long uniBId = uniB();
        RequestPostProcessor me = asSupervisorOf(uniA());

        // A spoofed universityId is ignored (L7): the course lands in uni A.
        MvcResult result = mockMvc.perform(post("/api/courses").with(me)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"universityId\":" + uniBId + ",\"programmeId\":2019,"
                                + "\"yearOfStudy\":2,\"courseCode\":\"FORCED" + suffix() + "\","
                                + "\"courseName\":\"Forced University Course\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.universityId").value(uniA()))
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).contains("Forced University Course");
    }

    @Test
    void supervisorListIsScopedToOwnUniversity() throws Exception {
        String ownCode = "OWN" + suffix();
        String farCode = "FAR" + suffix();
        createCourse(uniA(), ownCode);
        createCourse(uniB(), farCode);

        String body = mockMvc.perform(get("/api/courses").with(asSupervisorOf(uniA())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains(ownCode);
        assertThat(body).doesNotContain(farCode);
    }

    @Test
    void supervisorCannotTouchAnotherUniversitysCourse() throws Exception {
        Long theirs = createCourse(uniB(), "TRESPASS" + suffix());

        mockMvc.perform(put("/api/courses/" + theirs).with(asSupervisorOf(uniA()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"courseCode\":\"HACK" + suffix() + "\",\"courseName\":\"Hacked\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/courses/" + theirs).with(asSupervisorOf(uniA())))
                .andExpect(status().isNotFound());

        // The row is untouched.
        assertThat(courseRepository.findById(theirs).orElseThrow().getCourseCode()).startsWith("TRESPASS");
    }

    @Test
    void duplicateCourseCodeIsRejected() throws Exception {
        Long universityId = uniA();
        String code = "DUP" + suffix();
        createCourse(universityId, code);

        mockMvc.perform(post("/api/courses").with(asSupervisorOf(universityId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programmeId\":2019,\"yearOfStudy\":1,\"courseCode\":\"" + code
                                + "\",\"courseName\":\"Duplicate Course\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void adminCanManageAnyUniversitysCourses() throws Exception {
        Long target = uniB();
        Long id = createCourseViaApi(asAdmin(), target, "ADM" + suffix());

        mockMvc.perform(put("/api/courses/" + id).with(asAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"courseCode\":\"ADM" + suffix() + "\",\"courseName\":\"Renamed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.universityId").value(target));

        mockMvc.perform(delete("/api/courses/" + id).with(asAdmin()))
                .andExpect(status().isNoContent());
    }

    @Test
    void studentCannotUseCourseEndpoints() throws Exception {
        String username = "coursestudent" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        mockMvc.perform(get("/api/courses")
                        .with(user(username).authorities(new SimpleGrantedAuthority("STUDENT"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void lookupIncludesUnitsForTheStudentsProgrammeAndYear() {
        // The CourseDataSeeder seeds the Nkumba IST programme (2019), years 1-4.
        String number = "LU" + suffix();
        String username = "lookupunits" + suffix();
        UserEntity studentUser = new UserEntity(username, "hash", Role.STUDENT);
        studentUser.setUniversityId(19L);
        studentUser.setMustChangePassword(false);
        userRepository.save(studentUser);

        Student student = new Student();
        student.setUserId(studentUser.getId());
        student.setUniversityId(19L);
        student.setFirstName("Unit");
        student.setLastName("Seeker");
        student.setStudentNumber(number);
        student.setRegistrationNumber("REG" + suffix());
        student.setDegreeProgram("BIST");
        student.setProgrammeId(2019L);
        student.setYearOfStudy(1);
        student = studentRepository.save(student);

        UserEntity actor = new UserEntity("unitco" + suffix(), "hash", Role.COMPANY);
        actor.setCompanyId(1L);
        actor.setMustChangePassword(false);
        userRepository.save(actor);

        StudentLookupDto dto = lookupService.lookup(actor, 19L, number, "127.0.0.1");

        assertThat(dto.units()).isNotEmpty();
        assertThat(dto.units()).allMatch(c -> c.getYearOfStudy() == null || c.getYearOfStudy() == 1);
        assertThat(dto.units()).extracting(Course::getCourseCode)
                .contains("IST1201", "IST1202", "IST1203");
        assertThat(dto.units()).extracting(Course::getCourseCode).doesNotContain("IST2201");
    }
}
