import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/challenges",
  asyncHandler(async (req, res) => {
    const all = await prisma.challenge.findMany({
      include: {
        _count: { select: { participants: true } },
        participants: { where: { userId: req.user.id } },
      },
      orderBy: { createdAt: "desc" },
    });
    const active = [];
    const available = [];
    for (const c of all) {
      const mine = c.participants[0];
      const shaped = {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        goalValue: c.goalValue,
        unit: c.unit,
        points: c.points,
        durationDays: c.durationDays,
        joined: c._count.participants,
        progress: mine?.progress ?? 0,
        completed: mine?.completed ?? false,
      };
      if (mine) active.push(shaped);
      else available.push(shaped);
    }
    res.json({ active, available });
  })
);

router.post(
  "/challenges/:id/join",
  asyncHandler(async (req, res) => {
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) throw new HttpError(404, "Challenge not found");
    const entry = await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: req.user.id } },
      create: { challengeId: challenge.id, userId: req.user.id },
      update: {},
    });
    res.status(201).json({ entry });
  })
);

const progressSchema = z.object({ progress: z.number().int().min(0) });

router.patch(
  "/challenges/:id/progress",
  validate(progressSchema),
  asyncHandler(async (req, res) => {
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) throw new HttpError(404, "Challenge not found");
    const entry = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: req.user.id } },
    });
    if (!entry) throw new HttpError(400, "Join the challenge first");

    const progress = req.body.progress;
    const justCompleted = !entry.completed && progress >= challenge.goalValue;

    const updated = await prisma.challengeParticipant.update({
      where: { id: entry.id },
      data: { progress, completed: entry.completed || progress >= challenge.goalValue },
    });

    let awarded = null;
    if (justCompleted) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { points: { increment: challenge.points } },
      });
      awarded = await prisma.reward.create({
        data: { userId: req.user.id, badge: `${challenge.title} Badge`, pointsAwarded: challenge.points },
      });
    }
    res.json({ entry: updated, awarded });
  })
);

router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "user" },
      orderBy: { points: "desc" },
      take: 20,
      select: { id: true, name: true, username: true, points: true },
    });
    res.json({
      leaderboard: users.map((u, i) => ({ ...u, rank: i + 1, isMe: u.id === req.user.id })),
    });
  })
);

export default router;
