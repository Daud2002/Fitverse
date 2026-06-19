import express from "express";
import cors from "cors";

import { UPLOADS_ROOT } from "./lib/uploads.js";
import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import workoutRoutes from "./modules/workout/workout.routes.js";
import nutritionRoutes from "./modules/nutrition/nutrition.routes.js";
import moodRoutes from "./modules/mood/mood.routes.js";
import socialRoutes from "./modules/social/social.routes.js";
import gamificationRoutes from "./modules/gamification/gamification.routes.js";
import sosRoutes from "./modules/sos/sos.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import coachRoutes from "./modules/coach/coach.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import systemRoutes from "./modules/system/system.routes.js";

import { errorHandler, notFound } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "15mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "fitverse-api" }));

  app.use("/system", systemRoutes);

  app.use("/uploads", express.static(UPLOADS_ROOT));

  app.use("/auth", authRoutes);
  app.use("/profile", profileRoutes);
  app.use("/workouts", workoutRoutes);
  app.use("/meals", nutritionRoutes);
  app.use("/moods", moodRoutes);
  app.use("/posts", socialRoutes);
  app.use("/gamification", gamificationRoutes);
  app.use("/sos", sosRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/coach", coachRoutes);
  app.use("/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
