package com.healthmate.telemedicine.config;

/**
 * Lightweight carrier for claims extracted from the MERN-issued JWT.
 * Stored on {@link org.springframework.security.core.Authentication#getDetails()}.
 */
public record JwtUserDetails(String userId, String username, String role) {
}
