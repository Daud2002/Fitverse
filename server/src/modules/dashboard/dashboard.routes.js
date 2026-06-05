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

    const [calAgg, workoutsCount, mealAgg, user, weekSessions, completedSessions] = await Promise.all([
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
      prisma.workoutSession.findMany({
        where: { userId, completedAt: { not: null } },
        select: { completedAt: true },
      }),
    ]);

    res.json({
      greetingName: user.name,
      stats: {
        caloriesBurned: calAgg._sum.caloriesBurned || 0,
        activeMinutes: (weekSessions || 0) * 20,
        workouts: workoutsCount,
        streakDays: computeStreak(completedSessions.map((s) => s.completedAt)),
      },
      todaysGoals: [
        { label: "Weekly Workout Goal", current: weekSessions, target: 5, unit: "workouts" },
        { label: "Daily Calorie Goal", current: mealAgg._sum.calories || 0, target: 2000, unit: "kcal" },
        { label: "Water Intake", current: 6, target: 8, unit: "glasses" },
      ],
    });
  })
);

function computeStreak(dates) {
  if (!dates.length) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const toDayNumber = (d) => Math.floor(new Date(d).setHours(0, 0, 0, 0) / dayMs);

  const activeDays = new Set(dates.map(toDayNumber));
  const today = toDayNumber(new Date());

  let cursor;
  if (activeDays.has(today)) cursor = today;
  else if (activeDays.has(today - 1)) cursor = today - 1;
  else return 0;

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

export default router;
