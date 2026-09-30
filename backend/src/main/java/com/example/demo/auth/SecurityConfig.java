package com.example.demo.auth;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * P0: the React SPA is the only UI (R12/R13) — form login, OAuth2 client and
 * the Thymeleaf stack are gone. CORS is pinned to APP_ALLOWED_ORIGINS (L17).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final AuthorityRefreshFilter authorityRefreshFilter;
    private final SessionFreshnessFilter sessionFreshnessFilter;

    @Value("${APP_ALLOWED_ORIGINS:http://localhost:3000}")
    private String allowedOrigins;

    public SecurityConfig(AuthorityRefreshFilter authorityRefreshFilter,
            SessionFreshnessFilter sessionFreshnessFilter) {
        this.authorityRefreshFilter = authorityRefreshFilter;
        this.sessionFreshnessFilter = sessionFreshnessFilter;
    }

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
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
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
            // P0 (L5): roles and enabled-flags take effect live — registered inside the
            // security chain so the refresh runs BEFORE authorization decisions.
            .addFilterBefore(sessionFreshnessFilter,
                    org.springframework.security.web.access.intercept.AuthorizationFilter.class)
            .addFilterBefore(authorityRefreshFilter,
                    org.springframework.security.web.access.intercept.AuthorizationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/", "/api/login", "/api/register", "/api/forgot-password", "/api/reset-password",
                        "/api/roles", "/api/universities/options", "/favicon.ico"
                ).permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/companies", "/api/supervisors").permitAll()
                .anyRequest().authenticated()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            )
            // SPA expects a machine-readable 401 (no server-rendered login page anymore)
            .exceptionHandling(ex -> ex.authenticationEntryPoint(
                    new org.springframework.security.web.authentication.HttpStatusEntryPoint(
                            org.springframework.http.HttpStatus.UNAUTHORIZED)))
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }
}
