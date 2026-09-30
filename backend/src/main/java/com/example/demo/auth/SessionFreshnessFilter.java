package com.example.demo.auth;

import java.io.IOException;
import java.time.ZoneId;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * P2 (L12): a password reset must kill the attacker's existing session. The
 * login flow stamps {@link #LOGIN_TIME_ATTRIBUTE} into the session; any request
 * whose stamp predates the account's last password change is logged out.
 */
@Component
public class SessionFreshnessFilter extends OncePerRequestFilter {

    public static final String LOGIN_TIME_ATTRIBUTE = "IMS_LOGIN_TIME";

    private final UserRepository userRepository;

    public SessionFreshnessFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (session != null && authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            Object stamp = session.getAttribute(LOGIN_TIME_ATTRIBUTE);
            if (stamp instanceof Long loginTime) {
                userRepository.findByUsername(authentication.getName()).ifPresent(user -> {
                    if (user.getPasswordChangedAt() != null
                            && loginTime < user.getPasswordChangedAt()
                                    .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()) {
                        session.invalidate();
                        SecurityContextHolder.clearContext();
                    }
                });
            }
        }
        chain.doFilter(request, response);
    }
}
