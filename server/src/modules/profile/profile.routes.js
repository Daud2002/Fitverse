import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().positive().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dietaryPreferences: z.string().optional(),
  medicalNotes: z.string().optional(),
  activityLevel: z.string().optional(),
  currentGoal: z.string().optional(),
  targetGoal: z.string().optional(),
  level: z.enum(["easy", "medium", "hard"]).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    const { passwordHash, ...rest } = user;
    res.json({ user: rest });
  })
);

router.put(
  "/",
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const userFields = {};
    for (const k of ["name", "age", "height", "weight", "gender"]) {
      if (b[k] !== undefined) userFields[k] = b[k];
    }
    const profileFields = {};
    for (const k of ["dietaryPreferences", "medicalNotes", "activityLevel", "currentGoal", "targetGoal", "level"]) {
      if (b[k] !== undefined) profileFields[k] = b[k];
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...userFields,
        profile: { upsert: { create: profileFields, update: profileFields } },
      },
      include: { profile: true },
    });
    const { passwordHash, ...rest } = user;
    res.json({ user: rest });
  })
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [sessions, totalCalAgg, user] = await Promise.all([
      prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } }),
      prisma.workoutSession.aggregate({ where: { userId }, _sum: { caloriesBurned: true } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const rewards = await prisma.reward.findMany({ where: { userId }, orderBy: { awardedAt: "desc" } });
    res.json({
      workouts: sessions,
      caloriesBurned: totalCalAgg._sum.caloriesBurned || 0,
      points: user.points,
      memberSince: user.createdAt,
      achievements: rewards.map((r) => r.badge),
    });
  })
);

export default router;
