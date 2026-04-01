package com.healthmate.telemedicine.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "consultations", indexes = {
        @Index(name = "idx_appointment", columnList = "appointment_id", unique = true),
        @Index(name = "idx_doctor",      columnList = "doctor_id"),
        @Index(name = "idx_patient",     columnList = "patient_id"),
        @Index(name = "idx_status",      columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false, unique = true, length = 24)
    private String appointmentId;

    @Column(name = "doctor_id", nullable = false, length = 24)
    private String doctorId;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "patient_id", nullable = false, length = 24)
    private String patientId;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "room_id", nullable = false, unique = true, length = 36)
    private String roomId;

    @Column(name = "join_link", nullable = false, length = 500)
    private String joinLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConsultationStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ConsultationStatus.SCHEDULED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
