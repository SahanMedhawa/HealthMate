# Kubernetes Deployment — HealthMate

Deploys all 9 HealthMate microservices on a local Minikube cluster using a single script.

## Prerequisites
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed

## Deploy (one command)

Open PowerShell **as Administrator** from the project root and run:

```powershell
cd d:\RecoverMedi\HealthMate
.\kubernetes\deploy.ps1
```

The script will automatically:
1. Start Minikube
2. Build all 9 Docker images inside Minikube (no registry needed)
3. Apply all Kubernetes manifests (Secrets → ConfigMaps → Services → Deployments)
4. Wait for every pod to become Ready
5. Print the gateway URL to open in your browser

## Folder Structure

```
kubernetes/
├── secrets/
│   └── healthmate-secrets.yaml        # API keys, DB URIs, passwords
│   └── healthmate-secrets.example.yaml # Placeholder template for local setup
├── legacy/
│   ├── admin.ai-services.yaml
│   ├── doctor-telemedicine-minikube.yaml
│   ├── healthmate-all.yaml
│   └── secrets.example.yaml           # Archived/legacy manifests (not used by deploy.ps1)
├── configmap/
│   ├── healthmate-configmap.yaml      # Ports, inter-service URLs
│   └── nginx-configmap.yaml           # Full Nginx reverse-proxy config
├── deployments/
│   ├── patient-deployment.yaml
│   ├── doctor-deployment.yaml
│   ├── appointment-deployment.yaml
│   ├── admin-deployment.yaml
│   ├── telemedicine-deployment.yaml   # Spring Boot / Java
│   ├── notification-deployment.yaml
│   ├── payment-deployment.yaml
│   ├── ai-deployment.yaml
│   └── nginx-deployment.yaml          # API Gateway
├── services/
│   └── all-services.yaml              # ClusterIP (internal) + NodePort (nginx)
└── deploy.ps1                         # One-click deploy script
```

## Useful Commands

```powershell
# Check all pods are Running
kubectl get pods

# Check services and ports
kubectl get services

# View logs for a specific pod
kubectl logs <pod-name>

# Describe a pod to debug issues
kubectl describe pod <pod-name>

# Open the Kubernetes dashboard
minikube dashboard

# Get gateway URL again
minikube service nginx-gateway --url

# Tear everything down
kubectl delete -f kubernetes/deployments/
kubectl delete -f kubernetes/services/
kubectl delete -f kubernetes/configmap/
kubectl delete -f kubernetes/secrets/
```

## Service Map

| Service | Internal DNS | Port |
|---|---|---|
| Patient Service | `patient-service` | 5001 |
| Doctor Service | `doctor-service` | 5002 |
| Appointment Service | `appointment-service` | 5003 |
| Admin Service | `admin-service` | 5004 |
| Telemedicine Service | `telemedicine-service` | 5005 |
| Notification Service | `notification-service` | 5006 |
| AI Symptom Checker | `ai-service` | 5007 |
| Payment Service | `payment-service` | 5008 |
| **Nginx Gateway** | **External via NodePort** | **30080** |
