import { Request, Response } from "express";
import axios from "axios";
import { ruleBasedCheck } from "../utils/ruleBased.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

export const checkSymptom = async (req: Request, res: Response) => {
  const { symptom } = req.body;
  if (!symptom) return res.status(400).json({ success: false, message: "Symptom required" });

  try {
    console.log("🔹 Calling Gemini API...");
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a healthcare assistant. Suggest a doctor specialty for symptom: "${symptom}". Reply ONLY in JSON: {"suggestedSpecialty":"", "urgency":"", "reason":""}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const aiResult = JSON.parse(text.replace(/```json|```/g, "").trim());

    return res.json({
      success: true,
      source: "gemini",
      disclaimer: "This is not a medical diagnosis.",
      data: aiResult
    });
  } catch (error) {
    console.warn("⚠ Gemini failed, using fallback", error);
    const fallback = ruleBasedCheck(symptom);
    return res.json({
      success: true,
      source: "rule-based",
      disclaimer: "This is not a medical diagnosis.",
      data: fallback
    });
  }
};