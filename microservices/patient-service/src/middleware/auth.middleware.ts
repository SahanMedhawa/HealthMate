import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string; role: string };
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "meditrack_jwt_secret_key_2024";

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

export const verifyToken = (token: string): any => {
    return jwt.verify(token, JWT_SECRET);
};

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            res
                .status(401)
                .json({ success: false, message: "Access denied. No token provided." });
            return;
        }

        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            res.status(401).json({ success: false, message: "Token has expired." });
        } else if (error.name === "JsonWebTokenError") {
            res.status(401).json({ success: false, message: "Invalid token." });
        } else {
            res
                .status(500)
                .json({ success: false, message: "Token verification failed." });
        }
    }
};
