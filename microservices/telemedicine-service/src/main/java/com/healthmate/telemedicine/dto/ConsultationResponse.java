package com.healthmate.telemedicine.dto;

import com.healthmate.telemedicine.model.ConsultationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConsultationResponse {

    private Long id;
    private String appointmentId;
    private String doctorId;
    private String doctorName;
    private String patientId;
    private String patientName;
    private String roomId;
    private String joinLink;
    private ConsultationStatus status;
    private LocalDateTime scheduledAt;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
