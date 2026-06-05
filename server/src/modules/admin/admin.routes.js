import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError, paginate } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { saveWorkoutImage } from "../../lib/uploads.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const [users, workouts, meals, challenges, sos, posts] = await Promise.all([
      prisma.user.count(),
      prisma.workoutPlan.count(),
      prisma.meal.count(),
      prisma.challenge.count(),
      prisma.sosAlert.count(),
      prisma.post.count(),
    ]);
    res.json({ counts: { users, workouts, meals, challenges, sos, posts } });
  })
);

router.get(
  "/analytics/charts",
  asyncHandler(async (_req, res) => {
    const days = 14;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [newUsers, recentMeals, mealsByType, mealsBySource, usersByGender] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      prisma.meal.findMany({ where: { timestamp: { gte: start } }, select: { timestamp: true } }),
      prisma.meal.groupBy({ by: ["mealType"], _count: { _all: true } }),
      prisma.meal.groupBy({ by: ["source"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["gender"], _count: { _all: true } }),
    ]);

    const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets[dayKey(d)] = { date: dayKey(d), users: 0, meals: 0 };
    }
    for (const u of newUsers) { const k = dayKey(u.createdAt); if (buckets[k]) buckets[k].users++; }
    for (const m of recentMeals) { const k = dayKey(m.timestamp); if (buckets[k]) buckets[k].meals++; }

    res.json({
      trend: Object.values(buckets),
      mealsByType: mealsByType.map((r) => ({ label: r.mealType, value: r._count._all })),
      mealsBySource: mealsBySource.map((r) => ({ label: r.source, value: r._count._all })),
      usersByGender: usersByGender.map((r) => ({ label: r.gender, value: r._count._all })),
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { skip, take, page, limit } = paginate(req.query);
    const q = req.query.q;
    const where = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }] }
      : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, username: true, email: true, gender: true, role: true, isActive: true, points: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  })
);

const activeSchema = z.object({ isActive: z.boolean() });
router.patch(
  "/users/:id",
  validate(activeSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      select: { id: true, isActive: true },
    });
    res.json({ user });
  })
);

router.get(
  "/workouts",
  asyncHandler(async (req, res) => {
    const { skip, take, page, limit } = paginate(req.query);
    const [items, total] = await Promise.all([
      prisma.workoutPlan.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { exercises: { orderBy: { order: "asc" } }, user: { select: { name: true } } },
      }),
      prisma.workoutPlan.count(),
    ]);
    res.json({ items, total, page, limit });
  })
);

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().default(3),
  reps: z.number().int().default(10),
  restSeconds: z.number().int().default(30),
  timerSeconds: z.number().int().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
});
const planSchema = z.object({
  name: z.string().min(1),
  category: z.string().default("Cardio"),
  durationMin: z.number().int().default(30),
  caloriesEst: z.number().int().default(0),
  level: z.enum(["easy", "medium", "hard"]).default("easy"),
  imageBase64: z.string().optional(),
  exercises: z.array(exerciseSchema).default([]),
});

router.post(
  "/workouts",
  validate(planSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    let plan = await prisma.workoutPlan.create({
      data: {
        name: b.name,
        category: b.category,
        durationMin: b.durationMin,
        caloriesEst: b.caloriesEst,
        level: b.level,
        isStock: true,
        exercises: { create: b.exercises.map((e, i) => ({ ...e, order: i })) },
      },
      include: { exercises: true },
    });
    if (b.imageBase64) {
      const imageUrl = await saveWorkoutImage(plan.id, b.imageBase64);
      plan = await prisma.workoutPlan.update({
        where: { id: plan.id },
        data: { imageUrl },
        include: { exercises: true },
      });
    }
    res.status(201).json({ plan });
  })
);

router.put(
  "/workouts/:id",
  validate(planSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const existing = await prisma.workoutPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Plan not found");
    await prisma.exercise.deleteMany({ where: { workoutPlanId: req.params.id } });
    const data = {
      name: b.name,
      category: b.category,
      durationMin: b.durationMin,
      caloriesEst: b.caloriesEst,
      level: b.level,
      exercises: { create: b.exercises.map((e, i) => ({ ...e, order: i })) },
    };
    if (b.imageBase64) {
      data.imageUrl = await saveWorkoutImage(req.params.id, b.imageBase64);
    }
    const plan = await prisma.workoutPlan.update({
      where: { id: req.params.id },
      data,
      include: { exercises: true },
    });
    res.json({ plan });
  })
);

router.delete(
  "/workouts/:id",
  asyncHandler(async (req, res) => {
    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.get(
  "/meals",
  asyncHandler(async (req, res) => {
    const { skip, take, page, limit } = paginate(req.query);
    const [items, total] = await Promise.all([
      prisma.meal.findMany({ skip, take, orderBy: { timestamp: "desc" }, include: { user: { select: { name: true } } } }),
      prisma.meal.count(),
    ]);
    res.json({ items, total, page, limit });
  })
);

const challengeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["personal", "community"]).default("personal"),
  goalValue: z.number().int().default(100),
  unit: z.string().default("points"),
  points: z.number().int().default(100),
  durationDays: z.number().int().default(30),
});

router.get(
  "/challenges",
  asyncHandler(async (_req, res) => {
    const items = await prisma.challenge.findMany({
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  })
);

router.post(
  "/challenges",
  validate(challengeSchema),
  asyncHandler(async (req, res) => {
    const challenge = await prisma.challenge.create({ data: req.body });
    res.status(201).json({ challenge });
  })
);

router.delete(
  "/challenges/:id",
  asyncHandler(async (req, res) => {
    await prisma.challenge.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.get(
  "/posts",
  asyncHandler(async (_req, res) => {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, username: true, email: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    const items = posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.mediaUrl,
      visibility: p.visibility,
      createdAt: p.createdAt,
      user: p.user,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
    }));
    res.json({ items });
  })
);

router.delete(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.get(
  "/sos",
  asyncHandler(async (_req, res) => {
    const items = await prisma.sosAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, username: true } } },
    });
    res.json({ items });
  })
);

export default router;
