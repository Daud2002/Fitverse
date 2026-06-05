import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { signToken } from "../../lib/jwt.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  gender: z.enum(["male", "female", "other"]).default("other"),
  age: z.number().int().positive().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  currentGoal: z.string().optional(),
  targetGoal: z.string().optional(),
  level: z.enum(["easy", "medium", "hard"]).default("easy"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: b.email }, { username: b.username }] },
    });
    if (exists) throw new HttpError(409, "Email or username already in use");

    const passwordHash = await bcrypt.hash(b.password, 10);
    const user = await prisma.user.create({
      data: {
        name: b.name,
        username: b.username,
        email: b.email,
        passwordHash,
        gender: b.gender,
        age: b.age,
        height: b.height,
        weight: b.weight,
        profile: {
          create: {
            currentGoal: b.currentGoal,
            targetGoal: b.targetGoal,
            level: b.level,
          },
        },
      },
      include: { profile: true },
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
      include: { profile: true },
    });
    if (!user) throw new HttpError(401, "Invalid credentials");
    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid credentials");
    if (!user.isActive) throw new HttpError(403, "Account disabled");

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    res.json({ user: publicUser(user) });
  })
);

export default router;
