package com.example.demo.university;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.auth.UserEntity;
import com.example.demo.auth.UserRepository;
import com.example.demo.dto.UserDto;

/** P5 people management (plan §6.5) — SUPERVISOR own university, ADMIN broad. */
@RestController
@RequestMapping("/api/university")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR')") // PC7: managing university people is a university persona
public class UniversityPeopleController {

    private final UniversityPeopleService peopleService;
    private final UserRepository userRepository;

    public UniversityPeopleController(UniversityPeopleService peopleService, UserRepository userRepository) {
        this.peopleService = peopleService;
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public List<UserDto> list(Principal principal) {
        return peopleService.list(current(principal));
    }

    @PostMapping("/users")
    public ResponseEntity<UserDto> create(@RequestBody Map<String, Object> body, Principal principal) {
        UserEntity actor = current(principal);
        UserEntity created = peopleService.createPerson(actor, string(body.get("username")),
                string(body.get("role")), longValue(body.get("universityId")));
        UserDto dto = new UserDto(created.getId(), created.getUsername(), created.getRole().name(),
                created.getEmail(), created.getCompanyId(), created.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(created.getEnabled()));
        dto.setMustChangePassword(Boolean.TRUE.equals(created.getMustChangePassword()));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/users/{id}/role")
    public UserDto assignRole(@PathVariable Long id, @RequestBody Map<String, Object> body, Principal principal) {
        UserEntity target = peopleService.assignRole(current(principal), id, string(body.get("role")));
        return new UserDto(target.getId(), target.getUsername(), target.getRole().name(),
                target.getEmail(), target.getCompanyId(), target.getUniversityId());
    }

    @PostMapping("/users/{id}/enabled")
    public UserDto setEnabled(@PathVariable Long id, @RequestBody Map<String, Object> body, Principal principal) {
        boolean enabled = !Boolean.FALSE.equals(body.get("enabled"));
        UserEntity target = peopleService.setEnabled(current(principal), id, enabled);
        UserDto dto = new UserDto(target.getId(), target.getUsername(), target.getRole().name(),
                target.getEmail(), target.getCompanyId(), target.getUniversityId());
        dto.setEnabled(Boolean.TRUE.equals(target.getEnabled()));
        return dto;
    }

    private UserEntity current(Principal principal) {
        return userRepository.findByUsername(principal.getName()).orElseThrow();
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
    }

    private Long longValue(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
