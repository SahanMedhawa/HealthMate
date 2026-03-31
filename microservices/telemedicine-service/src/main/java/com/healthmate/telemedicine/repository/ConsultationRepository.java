package com.healthmate.telemedicine.repository;

import com.healthmate.telemedicine.model.Consultation;
import com.healthmate.telemedicine.model.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    Optional<Consultation> findByAppointmentId(String appointmentId);

    List<Consultation> findByDoctorIdOrderByScheduledAtDesc(String doctorId);

    List<Consultation> findByPatientIdOrderByScheduledAtDesc(String patientId);

    List<Consultation> findByStatus(ConsultationStatus status);

    boolean existsByAppointmentId(String appointmentId);
}
