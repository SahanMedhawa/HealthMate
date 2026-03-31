import axios, { type AxiosInstance } from "axios";

// Automatically use the Nginx Gateway for all requests
const BASE_URL = "http://localhost:8080/api";

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

// Intercept requests to attach Authorization token dynamically
api.interceptors.request.use(
    (config) => {
        const patientToken = localStorage.getItem("healthmate_token");
        const adminToken = localStorage.getItem("healthmate_admin_token");
        const legacyDoctorToken = localStorage.getItem("healthmate_doctor_token");
        const legacyToken = localStorage.getItem("token");

        const isAdminRoute = config.url?.startsWith("/admin");
        const token = isAdminRoute
            ? (adminToken || patientToken || legacyDoctorToken || legacyToken)
            : (patientToken || legacyDoctorToken || adminToken || legacyToken);

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercept responses for global 503 error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Handle the 503 Service Unavailable scenario
            if (error.response.status === 503) {
                console.error("GATEWAY ERROR: One of the microservices is down.");
                alert("The requested service is currently down or undergoing maintenance. Please try again later.");
            }

            // Optionally handle 401 Unauthorized to log users out
            if (error.response.status === 401) {
                console.warn("Unauthorized request. Token may be expired.");
                // Could trigger an event here to force logout if desired
            }
        } else if (error.request) {
            console.error("NETWORK ERROR: Gateway might be completely down.");
        }

        return Promise.reject(error);
    }
);

export default api;
