import admin from "firebase-admin";
import "dotenv/config";
import fs from "fs";
import path from "path";

if (!admin.apps.length) {
    try {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "serviceAccountKey.json";
        const fullPath = path.isAbsolute(serviceAccountPath) 
            ? serviceAccountPath 
            : path.join(process.cwd(), serviceAccountPath);

        if (fs.existsSync(fullPath)) {
            console.log(`Initializing Firebase with local key: ${fullPath}`);
            admin.initializeApp({
                credential: admin.credential.cert(fullPath),
            });
            console.log("Firebase Admin initialized successfully using JSON file");
        } else {
            // Fallback to environment variables
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

            if (!projectId || !clientEmail || !privateKey) {
                console.warn(
                    "CRITICAL: Firebase serviceAccountKey.json not found AND environment variables are missing. Firebase auth will fail."
                );
            } else {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    } as admin.ServiceAccount),
                });
                console.log("Firebase Admin initialized successfully using environment variables");
            }
        }
    } catch (error) {
        console.error("FATAL: Firebase initialization error:", error);
    }
}

export default admin;
