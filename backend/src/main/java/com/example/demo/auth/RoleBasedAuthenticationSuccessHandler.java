package com.example.demo.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class RoleBasedAuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final String STUDENT_HOME = "/student/dashboard";
    private static final String UNIVERSITY_HOME = "/university/dashboard";
    private static final String ADMIN_HOME = "/admin/dashboard";
    private static final String COMPANY_HOME = "/company/dashboard";

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        String targetUrl = resolveTargetUrl(authentication);
        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String resolveTargetUrl(Authentication authentication) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            switch (authority.getAuthority()) {
                case "ADMIN":
                    return ADMIN_HOME;
                case "SUPERVISOR":
                    return UNIVERSITY_HOME;
                case "COMPANY":
                    return COMPANY_HOME;
                default:
                    break;
            }
        }
        return STUDENT_HOME;
    }
}
