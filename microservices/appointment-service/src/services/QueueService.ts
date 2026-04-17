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

function parseColomboDateTime(date: string, time: string): Date {
    // Appointments store time as strings (e.g. HH:mm), normalize into a Colombo timestamp.
    const iso = `${date}T${time.length === 5 ? `${time}:00` : time}+05:30`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? new Date(`${date} ${time}`) : parsed;
}

function isPastDate(date: string): boolean {
    const today = normalizeDate(new Date());
    return date < today;
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
        await this.expireObsoleteQueues();
        return Queue.find({ doctorId }).sort({ date: -1 });
    }

    static async expireObsoleteQueues(): Promise<void> {
        const now = new Date();
        const today = normalizeDate(now);

        const activeQueues = await Queue.find({ status: "active" });

        for (const queue of activeQueues) {
            const queueDate = queue.date;

            if (isPastDate(queueDate)) {
                queue.status = "paused";
                queue.pausedAt = now;
                queue.pauseReason = "Auto-deactivated: queue date has passed";
                await queue.save();
                continue;
            }

            if (queueDate !== today) continue;

            const todaysAppointments = await Appointment.find({
                doctorId: queue.doctorId,
                date: queueDate,
                status: { $in: ["booked", "in_session"] },
            }).select("time status");

            const hasInSession = todaysAppointments.some((appointment) => appointment.status === "in_session");
            if (hasInSession) continue;

            const hasUpcoming = todaysAppointments.some((appointment) => {
                const appointmentTime = parseColomboDateTime(queueDate, appointment.time);
                return appointmentTime.getTime() >= now.getTime();
            });

            if (!hasUpcoming) {
                queue.status = "paused";
                queue.pausedAt = now;
                queue.pauseReason = "Auto-deactivated: queue time has passed";
                await queue.save();
            }
        }
    }

    static async getAllActiveQueues(): Promise<IQueue[]> {
        await this.expireObsoleteQueues();

        const queues = await Queue.find({}).sort({ date: -1 });
        const enrichedQueues = await Promise.all(
            queues.map(async (queue) => {
                const inSessionAppointment = await Appointment.findOne({
                    doctorId: queue.doctorId,
                    date: queue.date,
                    status: "in_session",
                })
                    .sort({ queueNumber: 1 })
                    .select("patientName queueNumber");

                const queueObj = queue.toObject();
                return {
                    ...queueObj,
                    currentInSession: inSessionAppointment
                        ? {
                            patientName: inSessionAppointment.patientName,
                            queueNumber: inSessionAppointment.queueNumber,
                        }
                        : null,
                };
            })
        );

        return enrichedQueues as any;
    }

    static async getQueueStats() {
        await this.expireObsoleteQueues();
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
