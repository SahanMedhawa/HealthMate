import { Server as SocketIOServer, type Server } from "socket.io";
import type { Server as HTTPServer } from "http";

interface ConnectedClient {
    userId: string;
    userType: string;
    rooms: string[];
}

export class SocketService {
    static io: SocketIOServer | null = null;
    static connectedClients = new Map<string, ConnectedClient>();

    static init(server: HTTPServer): SocketIOServer {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: ["http://localhost:5173", "http://localhost:3000", process.env.FRONTEND_URL || "http://localhost:5173"],
                methods: ["GET", "POST"],
                credentials: true,
            },
        });
        this.setupEventHandlers();
        return this.io;
    }

    static setupEventHandlers(): void {
        if (!this.io) return;
        this.io.on("connection", (socket) => {
            socket.on("authenticate", (data: { userId: string; userType: string }) => {
                this.connectedClients.set(socket.id, { userId: data.userId, userType: data.userType, rooms: [] });
                if (data.userType === "doctor") { const room = `doctor_${data.userId}`; socket.join(room); this.connectedClients.get(socket.id)?.rooms.push(room); }
                else if (data.userType === "admin") { socket.join("admin_room"); this.connectedClients.get(socket.id)?.rooms.push("admin_room"); }
                socket.emit("authenticated", { success: true });
            });
            socket.on("join_doctor_queue", (data: { doctorId: string; date: string }) => { const room = `queue_${data.doctorId}_${data.date}`; socket.join(room); const c = this.connectedClients.get(socket.id); if (c) c.rooms.push(room); });
            socket.on("leave_doctor_queue", (data: { doctorId: string; date: string }) => { const room = `queue_${data.doctorId}_${data.date}`; socket.leave(room); const c = this.connectedClients.get(socket.id); if (c) c.rooms = c.rooms.filter((r) => r !== room); });
            socket.on("disconnect", () => { this.connectedClients.delete(socket.id); });
        });
    }

    static broadcastQueueUpdate(payload: any): void {
        if (!this.io) return;
        const qRoom = `queue_${payload.doctorId}_${payload.date}`;
        const dRoom = `doctor_${payload.doctorId}`;
        this.io.to(qRoom).emit("queue_status_updated", { ...payload, message: payload.status === "paused" ? `Queue paused${payload.pauseReason ? `: ${payload.pauseReason}` : ""}` : "Queue resumed" });
        this.io.to(dRoom).emit("queue_status_updated", payload);
        this.io.to("admin_room").emit("queue_status_updated", { ...payload, adminNotification: true });
    }

    static broadcastAppointmentUpdate(payload: any): void {
        if (!this.io) return;
        this.io.to(`doctor_${payload.doctorId}`).emit("appointment_updated", payload);
        this.io.to(`patient_${payload.patientId}`).emit("appointment_updated", payload);
        this.io.to("admin_room").emit("appointment_updated", { ...payload, adminNotification: true });
        const date = payload.date || new Date().toISOString().split("T")[0];
        this.io.to(`queue_${payload.doctorId}_${date}`).emit("appointment_updated", payload);
    }

    static sendToUser(userId: string, event: string, data: any): void {
        if (!this.io) return;
        Array.from(this.connectedClients.entries()).filter(([_, c]) => c.userId === userId).forEach(([sid]) => { this.io?.to(sid).emit(event, data); });
    }

    static getConnectedClientsCount(): number { return this.connectedClients.size; }
    static getClientsByType(userType: string): number { return Array.from(this.connectedClients.values()).filter((c) => c.userType === userType).length; }
}
