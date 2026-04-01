package com.healthmate.telemedicine.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Intercepts every request, extracts the Bearer token, validates it via
 * {@link JwtTokenProvider}, and populates the Spring Security context with
 * the user's id, role (as a granted authority) and a {@link JwtUserDetails}
 * record on {@code Authentication.getDetails()}.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        if (jwtTokenProvider.isValid(token)) {
            String userId   = jwtTokenProvider.extractUserId(token);
            String role     = jwtTokenProvider.extractRole(token);
            String username = jwtTokenProvider.extractUsername(token);

            if (userId != null && role != null) {
                var authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));

                var authToken =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);
                authToken.setDetails(new JwtUserDetails(userId, username, role));

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
