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

    /** ADMIN (or super admin) — the broadest non-super scope. */
    public boolean isAdminLike(UserEntity user) {
        return isSuperAdmin(user) || "ADMIN".equals(user.getRole().name());
    }

    public boolean isUniversitySupervisor(UserEntity user) {
        return "SUPERVISOR".equals(user.getRole().name());
    }

    /** PC7 (D1): field supervisors are their own persona, company-scoped. */
    public boolean isIndustrialSupervisor(UserEntity user) {
        return "INDUSTRIAL_SUPERVISOR".equals(user.getRole().name());
    }

    /**
     * P5 (L7): a university supervisor may only act within their own university,
     * never on an ADMIN/super-admin target. Other-university targets are 404 (not
     * 403) so the caller cannot probe which accounts exist elsewhere.
     */
    public void requireUniversityCanAct(UserEntity actor, UserEntity target) {
        requireCanManage(actor, target);
        if (isAdminLike(actor)) {
            return;
        }
        // PC7: a company-scoped field supervisor is not a university persona and
        // must never manage university people (the old role name said SUPERVISOR).
        if (isIndustrialSupervisor(actor)) {
            throw new AccessDeniedException("You cannot manage this account.");
        }
        if (!isUniversitySupervisor(actor)) {
            throw new AccessDeniedException("You cannot manage this account.");
        }
        if (actor.getUniversityId() == null || target.getUniversityId() == null
                || !actor.getUniversityId().equals(target.getUniversityId())) {
            throw new java.util.NoSuchElementException("User not found.");
        }
    }
}
