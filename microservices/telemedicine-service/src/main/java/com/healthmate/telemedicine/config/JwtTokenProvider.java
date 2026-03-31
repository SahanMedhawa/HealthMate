package com.healthmate.telemedicine.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;

/**
 * Validates JWT tokens issued by the Node.js Auth / Doctor services.
 *
 * Uses raw HMAC-SHA256 verification instead of JJWT's parser because
 * the shared secret ({@code meditrack_jwt_secret_key_2024}, 29 bytes)
 * is shorter than JJWT's enforced 256-bit minimum for HS256 keys.
 * Node.js {@code jsonwebtoken} has no such restriction, so this manual
 * approach keeps both sides interoperable.
 */
@Component
public class JwtTokenProvider {

    private final SecretKeySpec secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret) {
        this.secretKey = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public Map<String, Object> extractAllClaims(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new JwtValidationException("Malformed JWT — expected 3 parts");
        }

        verifySignature(parts[0] + "." + parts[1], parts[2]);

        byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
        try {
            Map<String, Object> claims =
                    objectMapper.readValue(payload, new TypeReference<>() {});
            checkExpiration(claims);
            return claims;
        } catch (JwtValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new JwtValidationException("Failed to parse JWT payload: " + e.getMessage());
        }
    }

    public String extractUserId(String token) {
        Object id = extractAllClaims(token).get("id");
        return id != null ? id.toString() : null;
    }

    public String extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        return role != null ? role.toString() : null;
    }

    public String extractUsername(String token) {
        Object username = extractAllClaims(token).get("username");
        return username != null ? username.toString() : null;
    }

    public boolean isValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void verifySignature(String headerPayload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(secretKey);
            byte[] computed = mac.doFinal(
                    headerPayload.getBytes(StandardCharsets.UTF_8));
            String expected = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(computed);

            if (!MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8))) {
                throw new JwtValidationException("Invalid JWT signature");
            }
        } catch (JwtValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new JwtValidationException("Signature verification failed: " + e.getMessage());
        }
    }

    private void checkExpiration(Map<String, Object> claims) {
        Object exp = claims.get("exp");
        if (exp == null) return;

        long expSeconds = ((Number) exp).longValue();
        if (System.currentTimeMillis() / 1000 > expSeconds) {
            throw new JwtValidationException("Token has expired");
        }
    }

    public static class JwtValidationException extends RuntimeException {
        public JwtValidationException(String message) {
            super(message);
        }
    }
}
