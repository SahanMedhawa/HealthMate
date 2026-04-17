# ============================================================
#  HealthMate - Kubernetes Deploy Script (Minikube)
#  Run this from the root of the HealthMate project:
#    cd d:\RecoverMedi\HealthMate
#    .\kubernetes\deploy.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HealthMate - Kubernetes Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Start Minikube ────────────────────────────────────────────────
Write-Host "[1/6] Starting Minikube..." -ForegroundColor Yellow
$status = minikube status --format='{{.Host}}' 2>$null
if ($status -ne "Running") {
    minikube start --driver=docker --memory=4096 --cpus=4
} else {
    Write-Host "      Minikube already running. Skipping." -ForegroundColor Green
}

# ── Step 2: Point shell to Minikube's Docker daemon ──────────────────────
Write-Host ""
Write-Host "[2/6] Configuring Docker to use Minikube's daemon..." -ForegroundColor Yellow
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# ── Step 3: Build all Docker images inside Minikube ──────────────────────
Write-Host ""
Write-Host "[3/6] Building Docker images (this may take a few minutes)..." -ForegroundColor Yellow

$services = @(
    @{ Name = "patient-service";      Path = "microservices/patient-service" },
    @{ Name = "doctor-service";       Path = "microservices/doctor-service" },
    @{ Name = "appointment-service";  Path = "microservices/appointment-service" },
    @{ Name = "admin-service";        Path = "microservices/admin-service" },
    @{ Name = "telemedicine-service"; Path = "microservices/telemedicine-service" },
    @{ Name = "notification-service"; Path = "microservices/notification-service" },
    @{ Name = "payment-service";      Path = "microservices/payment-service" },
    @{ Name = "ai-service";           Path = "microservices/AI-service" }
)

foreach ($svc in $services) {
    Write-Host "  Building $($svc.Name)..." -ForegroundColor Gray
    docker build -t "$($svc.Name):latest" "$ROOT/$($svc.Path)"
    Write-Host "      Done." -ForegroundColor Green
}

# ── Step 4: Apply Kubernetes manifests ───────────────────────────────────
Write-Host ""
Write-Host "[4/6] Applying Kubernetes manifests..." -ForegroundColor Yellow

# Secrets & ConfigMaps first
kubectl apply -f "$ROOT/kubernetes/secrets/healthmate-secrets.yaml"
kubectl apply -f "$ROOT/kubernetes/configmap/healthmate-configmap.yaml"
kubectl apply -f "$ROOT/kubernetes/configmap/nginx-configmap.yaml"

# Services (create DNS names before pods start)
kubectl apply -f "$ROOT/kubernetes/services/all-services.yaml"

# Deployments
kubectl apply -f "$ROOT/kubernetes/deployments/patient-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/doctor-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/appointment-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/admin-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/notification-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/payment-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/ai-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/telemedicine-deployment.yaml"
kubectl apply -f "$ROOT/kubernetes/deployments/nginx-deployment.yaml"

# ── Step 5: Wait for pods to be ready ────────────────────────────────────
Write-Host ""
Write-Host "[5/6] Waiting for pods to become ready..." -ForegroundColor Yellow
Write-Host "      (Telemedicine/Java service may take up to 3 minutes)" -ForegroundColor Gray

$deployments = @(
    "patient-service", "doctor-service", "appointment-service",
    "admin-service", "notification-service", "payment-service",
    "ai-service", "nginx-gateway"
)

foreach ($d in $deployments) {
    Write-Host "  Waiting for $d..." -ForegroundColor Gray
    kubectl rollout status deployment/$d --timeout=120s
}

Write-Host "  Waiting for telemedicine-service (up to 5 min)..." -ForegroundColor Gray
kubectl rollout status deployment/telemedicine-service --timeout=300s

# ── Step 6: Print access instructions ──────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! HealthMate is running." -ForegroundColor Green
Write-Host ""
Write-Host "  Because you are on Windows, Minikube needs a tunnel." -ForegroundColor Yellow
Write-Host "  To access your app, run this command in your terminal:" -ForegroundColor Yellow
Write-Host ""
Write-Host "      kubectl port-forward svc/nginx-gateway 8080:8080" -ForegroundColor White
Write-Host ""
Write-Host "  Then open your browser to: http://localhost:8080" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
