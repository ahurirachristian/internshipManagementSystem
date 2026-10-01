package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.student.Student;
import com.example.demo.student.StudentRepository;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * PC5 gate: students-per-university is system-wide, so ADMIN is the only role that
 * may read it.
 *
 * <p>The app ships seeded universities and students, so nothing here asserts an
 * absolute total — every figure is a delta against the same endpoint read before
 * the fixtures were added. A test that pinned absolute counts would be measuring
 * the seeder, not this code.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminStudentsPerUniversityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UniversityRepository universityRepository;

    private Long university(String name) {
        University university = new University();
        university.setFullName(name);
        // short_form is NOT NULL and uniquely indexed.
        String base = name.replaceAll("[^A-Za-z]", "");
        String shortForm = (base.length() >= 3 ? base.substring(0, 3) : base + "X").toUpperCase();
        university.setShortForm(shortForm + System.nanoTime() % 100000);
        return universityRepository.save(university).getId().longValue();
    }

    private void student(String label, Long universityId) {
        UserEntity account = new UserEntity("adm-" + label + System.nanoTime(), "hash", Role.STUDENT);
        account.setMustChangePassword(false);
        userRepository.save(account);

        Student student = new Student();
        student.setUserId(account.getId());
        student.setUniversityId(universityId);
        student.setFirstName(label);
        student.setLastName("Student");
        student.setStudentNumber("S-" + label);
        student.setRegistrationNumber("R-" + label);
        student.setDegreeProgram("BSc");
        studentRepository.save(student);
    }

    private RequestPostProcessor asRole(Role role) {
        UserEntity account = new UserEntity("admreader-" + role.name() + System.nanoTime(), "hash", role);
        account.setMustChangePassword(false);
        userRepository.save(account);
        return user(account.getUsername()).authorities(new SimpleGrantedAuthority(role.name()));
    }

    /** Raw JSON body from the endpoint for the given admin principal. */
    private String body(RequestPostProcessor admin) throws Exception {
        return mockMvc.perform(get("/api/admin/analytics/students-per-university").with(admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    /**
     * Count for one university, read from the compact JSON by scanning forward from
     * the row's name to its count. Tests never parse with Jackson -- it is not on the
     * test classpath -- and the key order is fixed by the service's LinkedHashMap.
     */
    private long countFor(String json, String universityName) {
        int nameAt = json.indexOf("\"name\":\"" + universityName + "\"");
        if (nameAt < 0) {
            return 0L;
        }
        int countAt = json.indexOf("\"count\":", nameAt);
        int end = countAt + "\"count\":".length();
        StringBuilder digits = new StringBuilder();
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            digits.append(json.charAt(end));
            end++;
        }
        return digits.length() == 0 ? 0L : Long.parseLong(digits.toString());
    }

    /** Reads a top-level numeric field such as totalStudents or unassignedCount. */
    private long numberAt(String json, String field) {
        int at = json.indexOf("\"" + field + "\":");
        if (at < 0) {
            return -1L;
        }
        int start = at + field.length() + 3;
        StringBuilder digits = new StringBuilder();
        while (start < json.length() && Character.isDigit(json.charAt(start))) {
            digits.append(json.charAt(start));
            start++;
        }
        return digits.length() == 0 ? -1L : Long.parseLong(digits.toString());
    }

    @Test
    void eachNewStudentRaisesItsOwnUniversitiesCount() throws Exception {
        RequestPostProcessor admin = asRole(Role.ADMIN);
        Long big = university("Counting Big");
        Long small = university("Counting Small");

        long bigBefore = countFor(body(admin), "Counting Big");
        long smallBefore = countFor(body(admin), "Counting Small");

        student("A", big);
        student("B", big);
        student("C", big);
        student("D", small);

        String after = body(admin);
        assertThat(countFor(after, "Counting Big")).isEqualTo(bigBefore + 3);
        assertThat(countFor(after, "Counting Small")).isEqualTo(smallBefore + 1);
    }

    @Test
    void studentsWithNoUniversityAreCountedSeparatelyNotDropped() throws Exception {
        RequestPostProcessor admin = asRole(Role.ADMIN);
        long unassignedBefore = numberAt(body(admin), "unassignedCount");

        student("Orphan", null);

        String after = body(admin);
        assertThat(numberAt(after, "unassignedCount")).isEqualTo(unassignedBefore + 1);
        // The orphan's own name must not appear as a university row.
        assertThat(after).doesNotContain("\"name\":\"Orphan\"");
    }

    @Test
    void theBarTotalIsTheSumOfItsSegmentsIncludingUnassigned() throws Exception {
        RequestPostProcessor admin = asRole(Role.ADMIN);
        Long a = university("Recon A");
        Long b = university("Recon B");

        String before = body(admin);
        long aBefore = countFor(before, "Recon A");
        long bBefore = countFor(before, "Recon B");
        long unassignedBefore = numberAt(before, "unassignedCount");
        long totalBefore = numberAt(before, "totalStudents");

        student("A1", a);
        student("A2", a);
        student("B1", b);
        student("Free", null);

        // 2 + 1 + 1 unassigned = 4 new students, each counted exactly once. If the
        // segments ever stop summing to the headline, the chart misstates the total.
        String after = body(admin);
        assertThat(numberAt(after, "totalStudents")).isEqualTo(totalBefore + 4);
        assertThat(countFor(after, "Recon A")).isEqualTo(aBefore + 2);
        assertThat(countFor(after, "Recon B")).isEqualTo(bBefore + 1);
        assertThat(numberAt(after, "unassignedCount")).isEqualTo(unassignedBefore + 1);
    }

    @Test
    void ordersUniversitiesLargestFirst() throws Exception {
        RequestPostProcessor admin = asRole(Role.ADMIN);
        Long large = university("Ordered Large");
        Long tiny = university("Ordered Tiny");

        for (int i = 0; i < 5; i++) {
            student("L" + i, large);
        }
        student("T", tiny);

        String json = body(admin);
        int largeAt = json.indexOf("\"name\":\"Ordered Large\"");
        int tinyAt = json.indexOf("\"name\":\"Ordered Tiny\"");
        assertThat(largeAt).isGreaterThanOrEqualTo(0);
        assertThat(tinyAt).isGreaterThanOrEqualTo(0);
        // The bar answers "which university dominates", so order is load-bearing.
        assertThat(largeAt).isLessThan(tinyAt);
    }

    @Test
    void nonAdminRolesAreRefused() throws Exception {
        for (Role role : new Role[] { Role.SUPERVISOR, Role.COMPANY, Role.STUDENT }) {
            mockMvc.perform(get("/api/admin/analytics/students-per-university").with(asRole(role)))
                    .andExpect(status().isForbidden());
        }
    }
}
