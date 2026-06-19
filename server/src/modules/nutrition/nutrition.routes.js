import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { recognizeMeal, searchFoods } from "../../ai/visionService.js";
import { saveUserImage } from "../../lib/uploads.js";

const router = Router();
router.use(requireAuth);

// Portion presets (grams) used to scale USDA per-100g nutrition for manual tracking.
const PORTIONS = { Small: 200, Medium: 350, Large: 500 };
const MEAL_TYPES = ["Breakfast", "Brunch", "Lunch", "Dinner", "Snack"];

function rangeWindow(range) {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - 6);
  else if (range === "month") start.setDate(start.getDate() - 29);
  // "today" / "day" / anything else: from local midnight to now.
  return { start, end };
}

const dayMs = 24 * 60 * 60 * 1000;
const dayKey = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const recognizeSchema = z.object({ imageBase64: z.string().min(1) });

router.post(
  "/recognize",
  validate(recognizeSchema),
  asyncHandler(async (req, res) => {
    const result = await recognizeMeal(req.body.imageBase64);
    if (result.isFood === false) {
      throw new HttpError(422, "No food detected. Please retake the photo of your meal.");
    }
    res.json({ result });
  })
);

// Paginated live USDA food search for the manual-tracking catalog.
const catalogSchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  "/catalog",
  asyncHandler(async (req, res) => {
    const parsed = catalogSchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, "Invalid search parameters");
    const { search, page, pageSize } = parsed.data;
    if (!search) return res.json({ items: [], page: 1, totalPages: 0, totalHits: 0 });
    const result = await searchFoods(search, { page, pageSize });
    res.json(result);
  })
);

const per100gSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

const mealSchema = z.object({
  name: z.string().min(1),
  // Macros are optional: the manual path sends per100g + portion and the server computes them.
  calories: z.number().int().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  source: z.enum(["photo", "manual"]).default("manual"),
  imageUrl: z.string().optional(),
  imageBase64: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  mealType: z.enum(MEAL_TYPES),
  // Manual-tracking (catalog) path: scale USDA per-100g nutrition by a portion preset.
  per100g: per100gSchema.optional(),
  portion: z.enum(["Small", "Medium", "Large"]).optional(),
});

router.post(
  "/",
  validate(mealSchema),
  asyncHandler(async (req, res) => {
    const { imageBase64, per100g, portion, ...mealData } = req.body;

    // Manual path: compute final macros from per-100g values × the portion's grams.
    if (per100g && portion) {
      const grams = PORTIONS[portion];
      const factor = grams / 100;
      mealData.calories = Math.round(per100g.calories * factor);
      mealData.protein = Math.round(per100g.protein * factor);
      mealData.carbs = Math.round(per100g.carbs * factor);
      mealData.fat = Math.round(per100g.fat * factor);
      if (!/\(\s*(Small|Medium|Large)\s*\)/i.test(mealData.name)) {
        mealData.name = `${mealData.name} (${portion})`;
      }
    }

    if (mealData.calories == null) {
      throw new HttpError(400, "Meal nutrition is required.");
    }

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
    let start, end;
    // ?date=YYYY-MM-DD returns a single calendar day (used by the history drill-down).
    if (typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      start = new Date(`${req.query.date}T00:00:00`);
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    } else {
      ({ start, end } = rangeWindow(req.query.range));
    }
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

// Per-day nutrition buckets for the last N days (newest first), incl. today.
// Single query + in-memory bucketing avoids one aggregate call per day.
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const meals = await prisma.meal.findMany({
      where: { userId: req.user.id, timestamp: { gte: start } },
      select: { calories: true, protein: true, carbs: true, fat: true, timestamp: true },
    });

    // Seed a bucket for every day in the window so empty days still appear.
    const buckets = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * dayMs);
      buckets.set(d.getTime(), {
        date: d.toISOString(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
      });
    }

    for (const m of meals) {
      const b = buckets.get(dayKey(m.timestamp));
      if (!b) continue;
      b.calories += m.calories || 0;
      b.protein += m.protein || 0;
      b.carbs += m.carbs || 0;
      b.fat += m.fat || 0;
      b.count += 1;
    }

    // Newest first; round macros for display.
    const history = [...buckets.values()]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((b) => ({
        ...b,
        protein: Math.round(b.protein),
        carbs: Math.round(b.carbs),
        fat: Math.round(b.fat),
      }));

    res.json({ history, goalCalories: 2000 });
  })
);

export default router;
