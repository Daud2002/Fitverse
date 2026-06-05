import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { recognizeMeal } from "../../ai/visionService.js";
import { saveUserImage } from "../../lib/uploads.js";

const router = Router();
router.use(requireAuth);

function rangeWindow(range) {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - 6);
  else if (range === "month") start.setDate(start.getDate() - 29);
  return { start, end };
}

const recognizeSchema = z.object({ imageBase64: z.string().min(1) });

router.post(
  "/recognize",
  validate(recognizeSchema),
  asyncHandler(async (req, res) => {
    const result = await recognizeMeal(req.body.imageBase64);
    res.json({ result });
  })
);

const mealSchema = z.object({
  name: z.string().min(1),
  calories: z.number().int().min(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  source: z.enum(["photo", "manual"]).default("manual"),
  imageUrl: z.string().optional(),
  imageBase64: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).default("Breakfast"),
});

router.post(
  "/",
  validate(mealSchema),
  asyncHandler(async (req, res) => {
    const { imageBase64, ...mealData } = req.body;
    console.log(`[meals] save: imageBase64 ${imageBase64 ? `present (${imageBase64.length} chars)` : "MISSING"}`);
    if (imageBase64) {
      mealData.imageUrl = await saveUserImage(req.user.id, imageBase64);
      console.log(`[meals] saved image -> ${mealData.imageUrl}`);
    }
    const meal = await prisma.meal.create({ data: { ...mealData, userId: req.user.id } });
    res.status(201).json({ meal });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeWindow(req.query.range);
    const meals = await prisma.meal.findMany({
      where: { userId: req.user.id, timestamp: { gte: start, lt: end } },
      orderBy: { timestamp: "desc" },
    });
    res.json({ meals });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeWindow(req.query.range);
    const agg = await prisma.meal.aggregate({
      where: { userId: req.user.id, timestamp: { gte: start, lt: end } },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
    });
    const days = req.query.range === "week" ? 7 : req.query.range === "month" ? 30 : 1;
    res.json({
      calories: agg._sum.calories || 0,
      protein: agg._sum.protein || 0,
      carbs: agg._sum.carbs || 0,
      fat: agg._sum.fat || 0,
      goalCalories: 2000 * days,
    });
  })
);

export default router;
