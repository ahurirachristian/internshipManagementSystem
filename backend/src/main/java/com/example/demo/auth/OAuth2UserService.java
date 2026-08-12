package com.example.demo.auth;

import java.util.Collections;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    public OAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        String providerId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        if (email == null || email.isEmpty()) {
            email = providerId + "@" + provider + ".com";
        }

        String username = email;

        UserEntity existingUser = userRepository.findByUsername(username).orElse(null);
        if (existingUser == null) {
            userRepository.findByProviderId(providerId).ifPresentOrElse(
                    user -> {
                        user.setUsername(username);
                        userRepository.save(user);
                    },
                    () -> {
                        UserEntity newUser = new UserEntity(username, null, Role.STUDENT, provider, providerId);
                        userRepository.save(newUser);
                    }
            );
        }

        return new org.springframework.security.oauth2.core.user.DefaultOAuth2User(
                Collections.singletonList(new SimpleGrantedAuthority("STUDENT")),
                oAuth2User.getAttributes(),
                "sub"
        );
    }
}