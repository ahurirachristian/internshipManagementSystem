package com.example.demo.auth;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * P4 (L6/L7): the single place scope rules live. P5/P6 extend the university and
 * company cases; for now the guards cover the super-admin invariants.
 */
@Service
public class AuthorizationScopeService {

    public boolean isSuperAdmin(UserEntity user) {
        return Boolean.TRUE.equals(user.getSuperAdmin());
    }

    /**
     * Only a super admin may act on an ADMIN or super-admin account. A university
     * or company scoped caller must never reach these targets.
     */
    public void requireCanManage(UserEntity actor, UserEntity target) {
        boolean privilegedTarget = Boolean.TRUE.equals(target.getSuperAdmin())
                || "ADMIN".equals(target.getRole().name());
        if (privilegedTarget && !isSuperAdmin(actor)) {
            throw new AccessDeniedException("Only a super admin can act on this account.");
        }
    }

    /** A super admin may act on anyone; nobody may act on themselves for destructive ops. */
    public void requireNotSelf(UserEntity actor, UserEntity target) {
        if (actor.getId().equals(target.getId())) {
            throw new IllegalArgumentException("You cannot perform this action on your own account.");
        }
    }
}
