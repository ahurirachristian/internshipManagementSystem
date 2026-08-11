package com.example.demo.auth;

<<<<<<< HEAD
import org.springframework.beans.factory.annotation.Autowired;
=======
import java.util.List;
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
<<<<<<< HEAD
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
=======
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

<<<<<<< HEAD
    @Autowired
    private CustomAuthenticationSuccessHandler customAuthenticationSuccessHandler;
=======
    private final RoleBasedAuthenticationSuccessHandler authenticationSuccessHandler;

    public SecurityConfig(RoleBasedAuthenticationSuccessHandler authenticationSuccessHandler) {
        this.authenticationSuccessHandler = authenticationSuccessHandler;
    }
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
<<<<<<< HEAD
                .requestMatchers("/", "/login", "/admin/login", "/register", "/css/**", "/js/**", "/h2-console/**").permitAll()
=======
                .requestMatchers("/", "/login", "/api/login", "/css/**", "/js/**", "/images/**", "/assets/**", "/app.js", "/favicon.ico", "/h2-console/**").permitAll()
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
                .requestMatchers("/admin/**").hasAuthority("ADMIN")
                .requestMatchers("/university/universities/search").hasAnyAuthority("STUDENT", "SUPERVISOR", "ADMIN")
                .requestMatchers("/university/**", "/supervisor/**").hasAnyAuthority("SUPERVISOR", "ADMIN")
                .requestMatchers("/company/dashboard", "/company/**", "/students/**").hasAnyAuthority("ADMIN", "SUPERVISOR", "COMPANY")
                .requestMatchers("/student/**").hasAnyAuthority("STUDENT", "SUPERVISOR", "ADMIN")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
<<<<<<< HEAD
                .successHandler(customAuthenticationSuccessHandler)
=======
                .successHandler(authenticationSuccessHandler)
>>>>>>> a7c5463aec85f195e051f8868f6977e6e9e0f264
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            )
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }
}