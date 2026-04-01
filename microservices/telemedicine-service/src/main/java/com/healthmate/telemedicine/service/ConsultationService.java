package com.healthmate.telemedicine.service;

import com.healthmate.telemedicine.dto.ConsultationResponse;
import com.healthmate.telemedicine.dto.CreateConsultationRequest;
import com.healthmate.telemedicine.exception.DuplicateResourceException;
import com.healthmate.telemedicine.exception.ResourceNotFoundException;
import com.healthmate.telemedicine.exception.UnauthorizedAccessException;
import com.healthmate.telemedicine.model.Consultation;
import com.healthmate.telemedicine.model.ConsultationStatus;
import com.healthmate.telemedicine.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;

    @Value("${app.jitsi.base-url}")
    private String jitsiBaseUrl;

    /* ──────────────────── Create ──────────────────── */

    @Transactional
    public ConsultationResponse createConsultation(
            CreateConsultationRequest request, String doctorId) {

        if (consultationRepository.existsByAppointmentId(request.getAppointmentId())) {
            throw new DuplicateResourceException(
                    "A consultation session already exists for appointment: "
                            + request.getAppointmentId());
        }

        String roomId   = UUID.randomUUID().toString();
        String joinLink = jitsiBaseUrl + "/" + roomId;

        Consultation consultation = Consultation.builder()
                .appointmentId(request.getAppointmentId())
                .doctorId(doctorId)
                .doctorName(request.getDoctorName())
                .patientId(request.getPatientId())
                .patientName(request.getPatientName())
                .roomId(roomId)
                .joinLink(joinLink)
                .status(ConsultationStatus.SCHEDULED)
                .scheduledAt(request.getScheduledAt())
                .notes(request.getNotes())
                .build();

        return toResponse(consultationRepository.save(consultation));
    }

    /* ──────────────────── Join / Read ──────────────────── */

    @Transactional(readOnly = true)
    public ConsultationResponse getByAppointmentId(
            String appointmentId, String userId, String role) {

        Consultation c = findByAppointmentOrThrow(appointmentId);
        authorizeParticipant(c, userId, role);
        return toResponse(c);
    }

    /* ──────────────────── Status transitions ──────────────────── */

    @Transactional
    public ConsultationResponse updateStatus(
            String appointmentId,
            ConsultationStatus newStatus,
            String notes,
            String userId,
            String role) {

        Consultation c = findByAppointmentOrThrow(appointmentId);

        if (!"doctor".equalsIgnoreCase(role) || !c.getDoctorId().equals(userId)) {
            throw new UnauthorizedAccessException(
                    "Only the assigned doctor can update consultation status.");
        }

        validateTransition(c.getStatus(), newStatus);
        c.setStatus(newStatus);

        if (newStatus == ConsultationStatus.IN_PROGRESS && c.getStartTime() == null) {
            c.setStartTime(LocalDateTime.now());
        }
        if (newStatus == ConsultationStatus.COMPLETED
                || newStatus == ConsultationStatus.CANCELLED) {
            c.setEndTime(LocalDateTime.now());
        }
        if (notes != null && !notes.isBlank()) {
            c.setNotes(notes);
        }

        return toResponse(consultationRepository.save(c));
    }

    /* ──────────────────── History ──────────────────── */

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getDoctorHistory(String doctorId) {
        return consultationRepository.findByDoctorIdOrderByScheduledAtDesc(doctorId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getPatientHistory(String patientId) {
        return consultationRepository.findByPatientIdOrderByScheduledAtDesc(patientId)
                .stream().map(this::toResponse).toList();
    }

    /* ──────────────────── Helpers ──────────────────── */

    private Consultation findByAppointmentOrThrow(String appointmentId) {
        return consultationRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No consultation found for appointment: " + appointmentId));
    }

    private void authorizeParticipant(Consultation c, String userId, String role) {
        boolean allowed =
                ("doctor".equalsIgnoreCase(role) && c.getDoctorId().equals(userId))
             || ("patient".equalsIgnoreCase(role) && c.getPatientId().equals(userId))
             || "admin".equalsIgnoreCase(role);

        if (!allowed) {
            throw new UnauthorizedAccessException(
                    "You are not authorized to access this consultation session.");
        }
    }

    private void validateTransition(ConsultationStatus current, ConsultationStatus next) {
        boolean valid = switch (current) {
            case SCHEDULED   -> next == ConsultationStatus.IN_PROGRESS
                             || next == ConsultationStatus.CANCELLED;
            case IN_PROGRESS -> next == ConsultationStatus.COMPLETED
                             || next == ConsultationStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };

        if (!valid) {
            throw new IllegalArgumentException(
                    String.format("Invalid status transition from %s to %s", current, next));
        }
    }

    private ConsultationResponse toResponse(Consultation c) {
        return ConsultationResponse.builder()
                .id(c.getId())
                .appointmentId(c.getAppointmentId())
                .doctorId(c.getDoctorId())
                .doctorName(c.getDoctorName())
                .patientId(c.getPatientId())
                .patientName(c.getPatientName())
                .roomId(c.getRoomId())
                .joinLink(c.getJoinLink())
                .status(c.getStatus())
                .scheduledAt(c.getScheduledAt())
                .startTime(c.getStartTime())
                .endTime(c.getEndTime())
                .notes(c.getNotes())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
