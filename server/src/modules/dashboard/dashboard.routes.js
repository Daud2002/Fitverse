import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [calAgg, workoutsCount, mealAgg, user, weekSessions] = await Promise.all([
      prisma.workoutSession.aggregate({
        where: { userId, startedAt: { gte: dayStart } },
        _sum: { caloriesBurned: true },
      }),
      prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } }),
      prisma.meal.aggregate({
        where: { userId, timestamp: { gte: dayStart } },
        _sum: { calories: true },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.workoutSession.count({ where: { userId, completedAt: { gte: weekStart } } }),
    ]);

    res.json({
      greetingName: user.name,
      stats: {
        caloriesBurned: calAgg._sum.caloriesBurned || 0,
        activeMinutes: (weekSessions || 0) * 20,
        workouts: workoutsCount,
        streakDays: Math.min(workoutsCount, 15),
      },
      todaysGoals: [
        { label: "Weekly Workout Goal", current: weekSessions, target: 5, unit: "workouts" },
        { label: "Daily Calorie Goal", current: mealAgg._sum.calories || 0, target: 2000, unit: "kcal" },
        { label: "Water Intake", current: 6, target: 8, unit: "glasses" },
      ],
    });
  })
);

export default router;
