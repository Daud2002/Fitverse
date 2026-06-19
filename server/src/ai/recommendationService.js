import { hasGroq } from "../lib/config.js";
import { groqChat } from "./groqService.js";
import { prisma } from "../lib/prisma.js";

// Ionicons names so the mobile UI can render an icon per tip.
const ICONS = ["barbell", "nutrition", "water", "flame", "moon", "walk"];

function isToday(date) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function ruleBased({ gender, level, currentGoal, targetGoal }) {
  const goal = currentGoal || "general fitness";
  const tips = [
    {
      icon: "barbell",
      title: "Train with intent",
      body: `Aim for ${level === "hard" ? "5" : level === "medium" ? "4" : "3"} focused workouts this week toward "${goal}". Mix strength and cardio.`,
    },
    {
      icon: "nutrition",
      title: "Fuel your goal",
      body:
        gender === "female"
          ? "Prioritise protein (chicken, lentils, yogurt) and iron-rich foods. Keep portions steady across the day."
          : "Hit a solid protein target each meal and keep carbs around training for energy.",
    },
    {
      icon: "water",
      title: "Stay hydrated",
      body: "Drink at least 8 glasses of water daily — it supports recovery, energy and appetite control.",
    },
    {
      icon: "moon",
      title: "Recover well",
      body: targetGoal
        ? `Sleep 7–8 hours; consistent rest is what moves you toward ${targetGoal}.`
        : "Sleep 7–8 hours a night — recovery is where progress actually happens.",
    },
  ];
  return { tips, source: "rule-based" };
}

export async function getRecommendations(user, profile) {
  // Serve cached recommendations if they were generated today.
  if (profile?.recommendations && isToday(profile.recommendationsAt)) {
    return profile.recommendations;
  }

  const input = {
    gender: user?.gender || "other",
    level: profile?.level || "easy",
    currentGoal: profile?.currentGoal || null,
    targetGoal: profile?.targetGoal || null,
    age: user?.age ?? null,
    weight: user?.weight ?? null,
  };

  let result;
  if (hasGroq()) {
    try {
      const system = {
        role: "system",
        content:
          "You are a certified fitness and nutrition coach. Output STRICT JSON only, no prose. " +
          'Shape: {"tips":[{"icon":string,"title":string,"body":string}]}. ' +
          `Use 3-4 tips. "icon" must be one of: ${ICONS.join(", ")}. ` +
          "Titles <= 4 words. Bodies <= 22 words, specific and actionable. Cover both exercise and nutrition.",
      };
      const userMsg = {
        role: "user",
        content: `Personalize tips for: gender=${input.gender}, age=${input.age}, weight=${input.weight}kg, level=${input.level}, currentGoal="${input.currentGoal}", targetGoal="${input.targetGoal}".`,
      };
      const parsed = await groqChat([system, userMsg], { json: true });
      const tips = Array.isArray(parsed?.tips) ? parsed.tips.slice(0, 4) : [];
      if (tips.length) {
        result = {
          tips: tips.map((t, i) => ({
            icon: ICONS.includes(t.icon) ? t.icon : ICONS[i % ICONS.length],
            title: String(t.title || "Tip"),
            body: String(t.body || ""),
          })),
          source: "groq",
        };
      }
    } catch (err) {
      console.warn("recommendationService Groq failed, falling back:", err.message);
    }
  }

  if (!result) result = ruleBased(input);

  // Cache for the rest of the day so we don't re-hit Groq on every dashboard load.
  if (profile?.id) {
    await prisma.profile
      .update({
        where: { id: profile.id },
        data: { recommendations: result, recommendationsAt: new Date() },
      })
      .catch((e) => console.warn("recommendationService cache write failed:", e.message));
  }

  return result;
}
