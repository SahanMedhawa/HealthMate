import type { Request, Response, NextFunction } from "express";
import { authenticateToken } from "./auth.middleware.js";
import User from "../models/doctor.model.js";

declare global {
    namespace Express {
        interface Request {
            doctor?: {
                id: string;
                userType: string;
                fullName?: string;
                specialization?: string;
            };
        }
    }
}

export const requireDoctor = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await new Promise<void>((resolve, reject) => {
            authenticateToken(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.user || req.user.role !== "doctor") {
            res.status(403).json({ success: false, message: "Access denied. Doctor privileges required." });
            return;
        }

        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.userType !== "doctor" || !doctor.isVerified) {
            res.status(403).json({ success: false, message: "Access denied. Doctor account not found or inactive." });
            return;
        }

        req.doctor = {
            id: doctor._id.toString(),
            userType: doctor.userType,
            fullName: doctor.fullName,
            specialization: doctor.specialization,
        };

        next();
    } catch {
        res.status(500).json({ success: false, message: "Doctor authorization check failed." });
    }
};

export const optionalDoctorAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            next();
            return;
        }

        await new Promise<void>((resolve) => {
            authenticateToken(req, res, () => resolve());
        });

        if (req.user && req.user.role === "doctor") {
            const doctor = await User.findById(req.user.id);
            if (doctor && doctor.userType === "doctor" && doctor.isVerified) {
                req.doctor = {
                    id: doctor._id.toString(),
                    userType: doctor.userType,
                    fullName: doctor.fullName,
                    specialization: doctor.specialization,
                };
            }
        }

        next();
    } catch {
        next();
    }
};
