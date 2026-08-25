package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.demo.dto.UniversityRequest;
import com.example.demo.university.University;
import com.example.demo.university.UniversityRepository;

/**
 * M5: the credential generator was retired; this now covers the surviving
 * university catalog operations.
 */
@ExtendWith(MockitoExtension.class)
class UniversityServiceTest {

    @Mock
    private com.example.demo.auth.UserRepository userRepository;

    @Mock
    private com.example.demo.student.StudentProfileRepository studentProfileRepository;

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
    void createShouldRejectBlankName() {
        UniversityRequest request = new UniversityRequest();
        request.setFullName("  ");
        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("full name is required");
    }

    @Test
    void createShouldRejectDuplicateFullName() {
        UniversityRequest request = new UniversityRequest();
        request.setFullName("Nkumba University");
        request.setShortForm("NKU");
        when(universityRepository.findByFullNameIgnoreCase("Nkumba University"))
                .thenReturn(Optional.of(new University()));
        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createShouldTrimAndPersist() {
        UniversityRequest request = new UniversityRequest();
        request.setFullName("  Kyambogo University ");
        request.setShortForm(" KYU ");
        when(universityRepository.findByFullNameIgnoreCase(any())).thenReturn(Optional.empty());
        when(universityRepository.findByShortFormIgnoreCase(any())).thenReturn(Optional.empty());
        when(universityRepository.save(any(University.class))).thenAnswer(inv -> inv.getArgument(0));

        University saved = service.create(request);

        assertThat(saved.getFullName()).isEqualTo("Kyambogo University");
        assertThat(saved.getShortForm()).isEqualTo("KYU");
        assertThat(saved.getCountry()).isEqualTo("Uganda");
    }
}
