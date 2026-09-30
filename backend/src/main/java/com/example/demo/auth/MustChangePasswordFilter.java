package com.example.demo.auth;

import java.io.IOException;
import java.util.Set;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * P4 (R14/L16): accounts carrying a weak/initial credential cannot use the app
 * until they set a new password. Enforced server-side — only the password
 * change itself, the identity endpoint and logout are allowed through.
 */
@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {

    /** Exact paths a flagged user may still reach (plan §9-P4 step 3). */
    private static final Set<String> ALLOWED = Set.of("/api/me/password", "/api/me", "/logout");

    private final UserRepository userRepository;

    public MustChangePasswordFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())
                && !ALLOWED.contains(request.getRequestURI())) {
            boolean flagged = userRepository.findByUsername(authentication.getName())
                    .map(user -> Boolean.TRUE.equals(user.getMustChangePassword()))
                    .orElse(false);
            if (flagged) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
