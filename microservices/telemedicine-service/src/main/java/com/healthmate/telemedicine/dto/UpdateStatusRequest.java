package com.healthmate.telemedicine.dto;

import com.healthmate.telemedicine.model.ConsultationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private ConsultationStatus status;

    private String notes;
}
