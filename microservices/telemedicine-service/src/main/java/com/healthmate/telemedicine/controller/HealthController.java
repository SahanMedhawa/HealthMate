package com.healthmate.telemedicine.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Standalone health endpoint at /api/health — mirrors the pattern
 * used by every other HealthMate MERN microservice and is reachable
 * by Docker health-checks without going through the Nginx gateway.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status",    "ok",
                "service",   "telemedicine-service",
                "port",      System.getenv("PORT") != null ? System.getenv("PORT") : "5005",
                "timestamp", Instant.now().toString()
        ));
    }
}
