package com.example.demo.auth;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dto.UserDto;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean usernameExists(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    public UserEntity createUser(String username, String password, Role role) {
        UserEntity user = new UserEntity(username, passwordEncoder.encode(password), role);
        return userRepository.save(user);
    }

    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }

    public UserEntity getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public UserDto toDto(UserEntity user) {
        return new UserDto(user.getId(), user.getUsername(), user.getRole().name(),
                user.getEmail(), user.getCompanyId(), user.getUniversityId());
    }

    public List<UserDto> getAllUsersDto() {
        return getAllUsers().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateUser(Long id, String username, Role role) {
        UserEntity user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setUsername(username);
        user.setRole(role);
        userRepository.save(user);
        return toDto(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
