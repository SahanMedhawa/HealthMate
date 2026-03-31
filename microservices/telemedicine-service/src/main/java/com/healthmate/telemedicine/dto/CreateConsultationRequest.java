package com.healthmate.telemedicine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateConsultationRequest {

    @NotBlank(message = "Appointment ID is required")
    @Pattern(regexp = "^[a-fA-F0-9]{24}$",
             message = "Appointment ID must be a valid 24-character MongoDB ObjectId")
    private String appointmentId;

    @NotBlank(message = "Patient ID is required")
    @Pattern(regexp = "^[a-fA-F0-9]{24}$",
             message = "Patient ID must be a valid 24-character MongoDB ObjectId")
    private String patientId;

    private String patientName;

    private String doctorName;

    @NotNull(message = "Scheduled time is required")
    private LocalDateTime scheduledAt;

    private String notes;
}
