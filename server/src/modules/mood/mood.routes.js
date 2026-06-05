import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const moodSchema = z.object({
  mood: z.string().min(1),
  intensity: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional(),
});

const SUGGESTIONS = {
  Stressed: "Try a 5-minute guided breathing session.",
  Sad: "A short walk or light workout can lift your mood.",
  Anxious: "Consider a calming meditation and hydration.",
  Tired: "Prioritize rest; a gentle stretch may help.",
  Happy: "Great! Channel it into a workout to keep the streak.",
  Calm: "Maintain it with mindful logging today.",
};

router.post(
  "/",
  validate(moodSchema),
  asyncHandler(async (req, res) => {
    const entry = await prisma.moodEntry.create({ data: { ...req.body, userId: req.user.id } });
    res.status(201).json({ entry, suggestion: SUGGESTIONS[req.body.mood] || "Keep tracking your mood daily." });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const entries = await prisma.moodEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { timestamp: "desc" },
      take: 30,
    });
    res.json({ entries });
  })
);

export default router;
