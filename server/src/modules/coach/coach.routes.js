import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { hasGroq } from "../../lib/config.js";
import { groqChat, groqChatStream } from "../../ai/groqService.js";

const router = Router();
router.use(requireAuth);

// Keep the conversation short so a runaway client can't blow up the token bill.
const MAX_HISTORY = 16;

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    .max(50),
});

function systemPrompt(user) {
  const profile = user?.profile;
  const ctx = [
    user?.gender && `gender: ${user.gender}`,
    profile?.level && `fitness level: ${profile.level}`,
    profile?.currentGoal && `current goal: ${profile.currentGoal}`,
    profile?.targetGoal && `target: ${profile.targetGoal}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    "You are FitVerse Coach, a focused fitness assistant. " +
    "You ONLY help with two things: (1) meal planning and nutrition, and (2) exercise and workout recommendations. " +
    "If the user asks about anything outside these topics — medical diagnosis or treatment, general knowledge, coding, news, relationships, finance, etc. — " +
    "politely decline in one sentence and steer the conversation back to meal planning or workouts. " +
    "Do not give medical advice; suggest seeing a professional for injuries or health conditions. " +
    "Keep replies concise, friendly, and actionable. Use short paragraphs or bullet points." +
    (ctx ? ` The user's profile — ${ctx} — tailor your advice accordingly.` : "")
  );
}

const UNAVAILABLE =
  "The AI coach isn't available right now. In the meantime, focus on balanced meals (protein, veggies, whole grains) and 3–4 workouts this week. 💪";
const ERROR_REPLY = "I'm having trouble reaching the coach right now. Please try again in a moment.";

async function buildMessages(userId, history) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  return [{ role: "system", content: systemPrompt(user) }, ...history.slice(-MAX_HISTORY)];
}

// Non-streaming reply (kept as a fallback for clients that can't stream).
router.post(
  "/chat",
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    if (!hasGroq()) return res.json({ reply: UNAVAILABLE });

    const messages = await buildMessages(req.user.id, req.body.messages);
    try {
      const reply = await groqChat(messages, { json: false });
      res.json({ reply: reply || "Sorry, I couldn't generate a reply. Try rephrasing your question." });
    } catch (err) {
      console.warn("[coach] groq failed:", err.message);
      res.json({ reply: ERROR_REPLY });
    }
  })
);

// Streaming reply via Server-Sent Events. Emits {"delta": "..."} frames, then a final
// {"done": true} frame. Errors are sent as {"error": "..."} so the client can show a message.
router.post(
  "/chat/stream",
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    if (!hasGroq()) {
      send({ delta: UNAVAILABLE });
      send({ done: true });
      return res.end();
    }

    try {
      const messages = await buildMessages(req.user.id, req.body.messages);
      await groqChatStream(messages, (delta) => send({ delta }));
      send({ done: true });
    } catch (err) {
      console.warn("[coach] stream failed:", err.message);
      send({ error: ERROR_REPLY });
    } finally {
      res.end();
    }
  })
);

export default router;
