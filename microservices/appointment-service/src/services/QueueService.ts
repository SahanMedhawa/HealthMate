import Queue, { IQueue } from "../models/queue.model.js";
import { Appointment } from "../models/appointment.model.js";

export function normalizeDate(dateInput: string | Date): string {
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
    const date = new Date(dateInput);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export interface QueueStatus {
    doctorId: string;
    date: string;
    status: "active" | "paused";
    currentAppointments: any[];
    waitingCount: number;
    pausedAt?: Date;
    pauseReason?: string;
}

export class QueueService {
    static async getOrCreateQueue(doctorId: string, date: string): Promise<IQueue> {
        const d = normalizeDate(date);
        return (await Queue.findOneAndUpdate({ doctorId, date: d }, { $setOnInsert: { status: "active" } }, { upsert: true, new: true }))!;
    }

    static async pauseQueue(doctorId: string, date: string, reason?: string): Promise<IQueue> {
        const d = normalizeDate(date);
        return (await Queue.findOneAndUpdate({ doctorId, date: d }, { $set: { status: "paused", pausedAt: new Date(), pauseReason: reason || "Doctor paused the queue" } }, { new: true, upsert: true }))!;
    }

    static async resumeQueue(doctorId: string, date: string): Promise<IQueue> {
        const d = normalizeDate(date);
        return (await Queue.findOneAndUpdate({ doctorId, date: d }, { $set: { status: "active", resumedAt: new Date() }, $unset: { pauseReason: "" } }, { new: true, upsert: true }))!;
    }

    static async getQueueStatus(doctorId: string, date: string): Promise<QueueStatus> {
        const d = normalizeDate(date);
        const queue = await Queue.findOne({ doctorId, date: d });
        const appointments = await Appointment.find({ doctorId, date: d, status: { $in: ["booked", "in_session"] } }).sort({ queueNumber: 1 });
        return {
            doctorId, date: d, status: (queue?.status || "active") as "active" | "paused",
            currentAppointments: appointments,
            waitingCount: appointments.filter((a) => a.status === "booked").length,
            pausedAt: queue?.pausedAt, pauseReason: queue?.pauseReason,
        };
    }

    static async getDoctorQueues(doctorId: string): Promise<IQueue[]> {
        return Queue.find({ doctorId }).sort({ date: -1 });
    }

    static async getAllActiveQueues(): Promise<IQueue[]> {
        return Queue.find({}).sort({ date: -1 });
    }

    static async getQueueStats() {
        const now = new Date();
        const todayColombo = normalizeDate(now);
        const todayISO = now.toISOString().split("T")[0]!;
        const [total, active, paused, todayC, todayI] = await Promise.all([
            Queue.countDocuments(), Queue.countDocuments({ status: "active" }),
            Queue.countDocuments({ status: "paused" }), Queue.countDocuments({ date: todayColombo }),
            Queue.countDocuments({ date: todayISO }),
        ]);
        return { total, active, paused, today: Math.max(todayC, todayI) };
    }
}
