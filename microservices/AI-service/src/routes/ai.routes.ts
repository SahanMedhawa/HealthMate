import { Router } from "express";
import { checkSymptom } from "../controllers/ai.controller.js";

const router = Router();

router.post("/check", checkSymptom);

export default router;