import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { generatePlan } from "../../ai/planService.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = {
      OR: [{ isStock: true }, { userId: req.user.id }],
    };
    if (req.query.category && req.query.category !== "All") {
      where.category = req.query.category;
    }
    const plans = await prisma.workoutPlan.findMany({
      where,
      include: { exercises: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ workouts: plans });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: req.params.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    if (!plan) throw new HttpError(404, "Workout not found");
    res.json({ workout: plan });
  })
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    if (!user.profile) throw new HttpError(400, "Complete your profile first");

    const plan = await generatePlan({
      gender: user.gender,
      weight: user.weight,
      age: user.age,
      currentGoal: user.profile.currentGoal,
      targetGoal: user.profile.targetGoal,
      level: user.profile.level,
    });

    const created = await prisma.workoutPlan.create({
      data: {
        userId: user.id,
        name: plan.name,
        category: plan.category || "Strength",
        goals: user.profile.currentGoal,
        durationMin: plan.durationMin || 30,
        caloriesEst: plan.caloriesEst || 250,
        level: plan.level || user.profile.level,
        isAiGenerated: true,
        exercises: {
          create: (plan.exercises || []).map((e, i) => ({
            name: e.name,
            sets: e.sets ?? 3,
            reps: e.reps ?? 10,
            restSeconds: e.restSeconds ?? 30,
            timerSeconds: e.timerSeconds ?? null,
            videoUrl: e.videoUrl ?? null,
            order: e.order ?? i,
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    res.status(201).json({ workout: created, dietPlan: plan.dietPlan, source: plan.source });
  })
);

const startSchema = z.object({ workoutPlanId: z.string() });

router.post(
  "/sessions",
  validate(startSchema),
  asyncHandler(async (req, res) => {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: req.body.workoutPlanId },
      include: { exercises: true },
    });
    if (!plan) throw new HttpError(404, "Workout not found");
    const session = await prisma.workoutSession.create({
      data: {
        userId: req.user.id,
        workoutPlanId: plan.id,
        exercisesTotal: plan.exercises.length,
      },
    });
    res.status(201).json({ session });
  })
);

const trackSchema = z.object({ exercisesDone: z.number().int().min(0) });

router.patch(
  "/sessions/:id",
  validate(trackSchema),
  asyncHandler(async (req, res) => {
    const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user.id) throw new HttpError(404, "Session not found");
    const updated = await prisma.workoutSession.update({
      where: { id: req.params.id },
      data: { exercisesDone: req.body.exercisesDone },
    });
    res.json({ session: updated });
  })
);

const completeSchema = z.object({ caloriesBurned: z.number().int().min(0).default(0) });

router.post(
  "/sessions/:id/complete",
  validate(completeSchema),
  asyncHandler(async (req, res) => {
    const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user.id) throw new HttpError(404, "Session not found");
    const updated = await prisma.workoutSession.update({
      where: { id: req.params.id },
      data: {
        completedAt: new Date(),
        caloriesBurned: req.body.caloriesBurned,
        exercisesDone: session.exercisesTotal,
      },
    });
    res.json({ session: updated });
  })
);

export default router;
