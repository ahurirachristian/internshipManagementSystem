package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.demo.auth.Role;
import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.StudentCredentialRequest;
import com.example.demo.student.StudentProfile;
import com.example.demo.student.StudentProfileRepository;
import com.example.demo.university.UniversityRepository;

@ExtendWith(MockitoExtension.class)
class UniversityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private UniversityRepository universityRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UniversityService service;

    @BeforeEach
    void setUp() {
        service = new UniversityService(userRepository, studentProfileRepository, universityRepository, passwordEncoder);
    }

    @Test
    void createStudentCredentialShouldSaveUserWithStudentRoleAndHashedPassword() {
        StudentCredentialRequest request = new StudentCredentialRequest();
        request.setFullName("Jane Doe");
        request.setEmail("jane@example.com");
        request.setStudentId("20240123");
        request.setDepartment("Computer Science");

        when(userRepository.findByUsername("jane@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Student@123")).thenReturn("encoded-password");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(studentProfileRepository.save(any(StudentProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserEntity user = service.createStudentCredential(request, "university-supervisor");

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getRole()).isEqualTo(Role.STUDENT);
        assertThat(userCaptor.getValue().getUsername()).isEqualTo("jane@example.com");
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("encoded-password");
        assertThat(user).isNotNull();
    }
}
