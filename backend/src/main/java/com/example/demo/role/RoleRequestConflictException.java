package com.example.demo.role;

/** P3: signal a duplicate or already-reviewed request (→ 409). */
public class RoleRequestConflictException extends RuntimeException {

    public RoleRequestConflictException(String message) {
        super(message);
    }
}
