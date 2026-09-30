package com.example.demo.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * P0 (L5): roles and enabled-flags take effect live. Every request re-reads the
 * user row and rebuilds the session authorities from the DB, so a role grant,
 * revocation or disable applies on the user's very next request — no re-login,
 * no session-eviction infrastructure.
 */
@Component
public class AuthorityRefreshFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public AuthorityRefreshFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            // A principal with no DB row (e.g. a MockMvc test principal) is left untouched.
            userRepository.findByUsername(authentication.getName()).ifPresent(user -> {
                if (!Boolean.TRUE.equals(user.getEnabled())) {
                    // Disabled account: kill the session entirely.
                    SecurityContextHolder.clearContext();
                    HttpSession session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    return;
                }
                var current = new java.util.HashSet<>(java.util.Collections
                        .singletonList(new SimpleGrantedAuthority(user.getRole().name())));
                if (Boolean.TRUE.equals(user.getSuperAdmin())) {
                    current.add(new SimpleGrantedAuthority("super_admin"));
                }
                if (!current.equals(new java.util.HashSet<>(authentication.getAuthorities()))) {
                    var refreshed = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                            authentication.getPrincipal(), authentication.getCredentials(), current);
                    refreshed.setDetails(authentication.getDetails());
                    SecurityContextHolder.getContext().setAuthentication(refreshed);
                }
            });
        }
        chain.doFilter(request, response);
    }
}
