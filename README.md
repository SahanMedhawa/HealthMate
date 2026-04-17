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

## 🚀 Deployment Guide

HealthMate is fully containerized and can be orchestrated locally using either **Docker Compose** (for rapid development) or **Kubernetes** (for production-grade scaling).

### Option 1: Docker Compose (Local Development)
The simplest way to stand up the entire architecture natively on your machine.

1. **Verify Dependencies**: Ensure Docker and Docker Desktop are running.
2. **Environment Variables**: Configure your `.env` (handled internally if referencing cloud MongoDB Atlas/Supabase).
3. **Launch Services**: In the root directory, run:
   ```bash
   docker-compose up --build -d
   ```
4. **Access Application**: Docker Compose spins up the Nginx API gateway bridging the microservices. Open the React frontend via your configured local port.

### Option 2: Kubernetes via Minikube
To run the fully scalable microservices architecture.

1. **Start Minikube**: Ensure your local Kubernetes cluster is active.
   ```bash
   minikube start
   ```
2. **Execute Automated Deployment**: A PowerShell script is provided to automatically bind to the Minikube Docker daemon, build all fresh images, and apply the required manifests (Secrets, ConfigMaps, Deployments, Services).
   ```powershell
   cd kubernetes
   ./deploy.ps1
   ```
3. **Verify Pods**: Ensure all 9 microservices and 1 gateway pod transition to `1/1 Running`.
   ```bash
   kubectl get pods
   ```
4. **Expose the Gateway**: Map the Nginx API gateway to your localhost.
   ```bash
   kubectl port-forward svc/nginx-gateway 8080:8080
   ```
5. **Launch Application**: Ensure your standalone frontend (Vite) is running and pointing to the localhost gateway.

## 🔐 Environment Variables Configuration

### Local / Docker Compose (`.env`)
For local development or Docker Compose setups, create a `.env` file at the root or within specific microservices. Below is a sample configuration containing the system's core dependencies:

```env
# Shared Configuration (Node.js Microservices)
PORT=500X # Varies per service (e.g. Doctor=5002, Appointment=5003)
MONGO_URI=mongodb+srv://<dbUser>:<dbpassword>@<cluster>.mongodb.net/healthmate?retryWrites=true&w=majority
JWT_SECRET=your_highly_secure_jwt_secret
API_GATEWAY_URL=http://localhost:8080

# Telemedicine & Video (Java Spring Boot)
DATASOURCE_URL=jdbc:postgresql://<aws-region>.pooler.supabase.com:6543/postgres
DATASOURCE_USERNAME=postgres.<supabase_id>
DATASOURCE_PASSWORD=your_supabase_password
JITSI_BASE_URL=https://meet.jit.si
```

### Kubernetes Configurations
For Kubernetes orchestration, we completely bypass `.env` files. Instead, environmental dependencies are securely injected at runtime into the pods. 

To configure your variables for the minikube cluster, edit the following core files *before* executing the deployment script:
1. **`kubernetes/secrets/healthmate-secrets.yaml`**: Update this file with your secure data (Base64 encoded) such as the `MONGO_URI`, Supabase `DATASOURCE_URL`, database passwords, and the `JWT_SECRET`.
2. **`kubernetes/configmap/healthmate-config.yaml`**: Use this to manage global, non-sensitive environmental mapping, such as configuring frontend/gateway addresses.

---

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
