package com.healthmate.telemedicine.controller;

import com.healthmate.telemedicine.config.JwtUserDetails;
import com.healthmate.telemedicine.dto.ApiResponse;
import com.healthmate.telemedicine.dto.ConsultationResponse;
import com.healthmate.telemedicine.dto.CreateConsultationRequest;
import com.healthmate.telemedicine.dto.UpdateStatusRequest;
import com.healthmate.telemedicine.service.ConsultationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/telemedicine")
@RequiredArgsConstructor
@Validated
public class ConsultationController {

    private final ConsultationService consultationService;

    private static final String OBJECT_ID_RE = "^[a-fA-F0-9]{24}$";

    /**
     * POST /api/telemedicine/create
     * Doctor-only — creates a Jitsi consultation room for an appointment.
     */
    @PostMapping("/create")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationResponse>> create(
            @Valid @RequestBody CreateConsultationRequest request,
            Authentication auth) {

        JwtUserDetails user = (JwtUserDetails) auth.getDetails();
        ConsultationResponse body = consultationService.createConsultation(
                request, user.userId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Consultation session created successfully", body));
    }

    /**
     * GET /api/telemedicine/join/{appointmentId}
     * Returns session details if the caller is an authorized participant.
     */
    @GetMapping("/join/{appointmentId}")
    public ResponseEntity<ApiResponse<ConsultationResponse>> join(
            @PathVariable
            @Pattern(regexp = OBJECT_ID_RE, message = "Invalid appointment ID format")
            String appointmentId,
            Authentication auth) {

        JwtUserDetails user = (JwtUserDetails) auth.getDetails();
        ConsultationResponse body = consultationService.getByAppointmentId(
                appointmentId, user.userId(), user.role());

        return ResponseEntity.ok(
                ApiResponse.success("Consultation session retrieved", body));
    }

    /**
     * PATCH /api/telemedicine/{appointmentId}/status
     * Doctor-only — transition session status (SCHEDULED → IN_PROGRESS → COMPLETED).
     */
    @PatchMapping("/{appointmentId}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<ConsultationResponse>> updateStatus(
            @PathVariable
            @Pattern(regexp = OBJECT_ID_RE, message = "Invalid appointment ID format")
            String appointmentId,
            @Valid @RequestBody UpdateStatusRequest request,
            Authentication auth) {

        JwtUserDetails user = (JwtUserDetails) auth.getDetails();
        ConsultationResponse body = consultationService.updateStatus(
                appointmentId, request.getStatus(), request.getNotes(),
                user.userId(), user.role());

        return ResponseEntity.ok(
                ApiResponse.success("Consultation status updated", body));
    }

    /**
     * GET /api/telemedicine/doctor/{doctorId}/history
     */
    @GetMapping("/doctor/{doctorId}/history")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> doctorHistory(
            @PathVariable
            @Pattern(regexp = OBJECT_ID_RE, message = "Invalid doctor ID format")
            String doctorId) {

        return ResponseEntity.ok(
                ApiResponse.success("Doctor consultation history retrieved",
                        consultationService.getDoctorHistory(doctorId)));
    }

    /**
     * GET /api/telemedicine/patient/{patientId}/history
     */
    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> patientHistory(
            @PathVariable
            @Pattern(regexp = OBJECT_ID_RE, message = "Invalid patient ID format")
            String patientId) {

        return ResponseEntity.ok(
                ApiResponse.success("Patient consultation history retrieved",
                        consultationService.getPatientHistory(patientId)));
    }
}
