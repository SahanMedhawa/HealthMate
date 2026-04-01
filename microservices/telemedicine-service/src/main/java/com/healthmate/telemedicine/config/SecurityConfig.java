package com.healthmate.telemedicine.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(
                            "/api/health",
                            "/api/telemedicine/health",
                            "/actuator/**"
                    ).permitAll()
                    .requestMatchers("/api/telemedicine/**").authenticated()
                    .anyRequest().permitAll()
            )
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, authEx) -> {
                        res.setContentType("application/json");
                        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        res.getWriter().write(
                                "{\"success\":false,\"message\":\"Authentication required. Please provide a valid token.\"}");
                    })
                    .accessDeniedHandler((req, res, denied) -> {
                        res.setContentType("application/json");
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.getWriter().write(
                                "{\"success\":false,\"message\":\"Access denied. Insufficient privileges.\"}");
                    })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "X-Requested-With", "Origin", "Accept"));
        config.setAllowCredentials(true);
        config.setMaxAge(86400L);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
