import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string; role: string };
            doctor?: { id: string; userType: string; fullName?: string; specialization?: string };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "meditrack_jwt_secret_key_2024";

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
