import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import type { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string; role: string };
            admin?: { id: string; username: string; fullName: string; email: string; role: "admin" };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "meditrack_jwt_secret_key_2024";

export const generateToken = (payload: object): string => jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
export const verifyToken = (token: string): any => jwt.verify(token, JWT_SECRET);

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) { res.status(401).json({ success: false, message: "Access denied. No token provided." }); return; }
        req.user = verifyToken(token);
        next();
    } catch (error: any) {
        if (error.name === "TokenExpiredError") res.status(401).json({ success: false, message: "Token has expired." });
        else if (error.name === "JsonWebTokenError") res.status(401).json({ success: false, message: "Invalid token." });
        else res.status(500).json({ success: false, message: "Token verification failed." });
    }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await new Promise<void>((resolve, reject) => { authenticateToken(req, res, (err) => { if (err) reject(err); else resolve(); }); });
        if (!req.user || req.user.role !== "admin") { res.status(403).json({ success: false, message: "Access denied. Admin privileges required." }); return; }
        const admin = await Admin.findById(req.user.id);
        if (!admin || !admin.isActive) { res.status(403).json({ success: false, message: "Admin not found or inactive." }); return; }
        req.admin = { id: admin._id.toString(), username: admin.username, fullName: admin.fullName, email: admin.email, role: admin.role };
        next();
    } catch { res.status(500).json({ success: false, message: "Authorization check failed." }); }
};
