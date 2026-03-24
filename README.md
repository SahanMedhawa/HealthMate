# HealthMate - Medical Appointment Booking & Queue System

A microservices-based healthcare platform built with **TypeScript**, **Express**, **MongoDB**, and **Socket.io**.

## Architecture

| # | Service | Port | Description |
|---|---------|------|-------------|
| 1 | patient-service | 5001 | Patient registration, Firebase auth, profiles |
| 2 | doctor-service | 5002 | Doctor CRUD, profiles, availability, diagnosis |
| 3 | appointment-service | 5003 | Appointment booking, queue management |
| 4 | admin-service | 5004 | Admin dashboard, system management |
| 5 | telemedicine-service | 5005 | Video consultations (planned) |
| 6 | notification-service | 5006 | Email & real-time WebSocket notifications |
| 7 | AI-service | 5007 | AI symptom checker (planned) |
| 8 | payment-service | 5008 | Payment processing (planned) |

## Quick Start

```bash
# Run with Docker
docker-compose up --build

# Run individually
cd microservices/patient-service && npm install && npm run dev
```

## Project Structure

```
HealthMate/
├── frontend/
├── microservices/
│   ├── patient-service/       (5001)
│   ├── doctor-service/        (5002)
│   ├── appointment-service/   (5003)
│   ├── admin-service/         (5004)
│   ├── telemedicine-service/  (5005)
│   ├── notification-service/  (5006)
│   ├── AI-service/            (5007)
│   └── payment-service/       (5008)
├── kubernetes/
├── docker-compose.yml
└── README.md
```

## Auth Strategy

- Patients: Firebase Google Sign-In → JWT
- Doctors: Email/password → JWT
- Admins: Username/password → JWT
- All services share `JWT_SECRET` for token verification
- Zero circular dependencies — each service has its own auth middleware copy
