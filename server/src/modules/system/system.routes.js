import { Router } from "express";
import { config } from "../../lib/config.js";

const router = Router();

// Public (no auth) — the mobile app polls this even when force-logged-out, so it must
// be reachable without a token. Returns the maintenance kill-switch state.
router.get("/status", (_req, res) => {
  res.json({ letThemWork: config.letThemWork });
});

export default router;
