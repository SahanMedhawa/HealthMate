import type { Request, Response } from "express";
import admin from "../config/firebase.js";
import User from "../models/user.model.js";

export const firebaseLogin = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { idToken, uid, email, name, photoURL } = req.body;

        if (!idToken || !uid || !email) {
            res
                .status(400)
                .json({ success: false, message: "Missing required Firebase data" });
            return;
        }

        // Verify Firebase token
        try {
            await admin.auth().verifyIdToken(idToken);
        } catch {
            res
                .status(401)
                .json({ success: false, message: "Invalid Firebase token" });
            return;
        }

        // Find or create user
        let user = await User.findOne({
            $or: [{ firebaseUid: uid }, { email: email.toLowerCase() }],
        });

        if (user) {
            user.firebaseUid = uid;
            user.photoURL = photoURL;
            if (!user.name && name) user.name = name;
            if (!user.userType) user.userType = "patient";
            await user.save();
        } else {
            user = new User({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                userType: "patient",
                firebaseUid: uid,
                photoURL,
                isVerified: true,
            });
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: "Firebase login successful",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    userType: user.userType,
                    photoURL: user.photoURL,
                    firebaseUid: user.firebaseUid,
                },
            },
        });
    } catch (error) {
        console.error("Firebase login error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

export const getUserById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res
                .status(400)
                .json({ success: false, message: "User ID is required" });
            return;
        }

        const user = await User.findById(id).select(
            "name email photoURL profilePictureUrl userType"
        );
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                photoURL: user.photoURL,
                profilePictureUrl: user.profilePictureUrl,
                userType: user.userType,
            },
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
export const getAllPatients = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const patients = await User.find({ userType: "patient" });
        res.status(200).json({ success: true, patients });
    } catch (error) {
        console.error("Get all patients error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
