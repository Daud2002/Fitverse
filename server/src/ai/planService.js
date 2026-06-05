import { hasGemini } from "../lib/config.js";
import { geminiText } from "./geminiService.js";

const VIDEO = {
  "Push-ups": "https://www.youtube.com/watch?v=IODxDxX7oi4",
  "Squats": "https://www.youtube.com/watch?v=aclHkVaku9U",
  "Plank": "https://www.youtube.com/watch?v=pSHjTRCQxIw",
  "Lunges": "https://www.youtube.com/watch?v=QOVaHwm-Q6U",
  "Burpees": "https://www.youtube.com/watch?v=TU8QYVW0gDU",
  "Jumping Jacks": "https://www.youtube.com/watch?v=c4DAnQ6DtF8",
  "Mountain Climbers": "https://www.youtube.com/watch?v=nmwgirgXLYM",
  "Glute Bridge": "https://www.youtube.com/watch?v=wPM8icPu6H8",
  "Bicep Curls": "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
  "Crunches": "https://www.youtube.com/watch?v=Xyd_fa5zoEU",
};

const REP_BY_LEVEL = { easy: 8, medium: 12, hard: 16 };
const SETS_BY_LEVEL = { easy: 2, medium: 3, hard: 4 };

function ruleBasedPlan({ gender, level, currentGoal }) {
  const reps = REP_BY_LEVEL[level] || 10;
  const sets = SETS_BY_LEVEL[level] || 3;

  const base = ["Jumping Jacks", "Push-ups", "Squats", "Plank", "Mountain Climbers"];
  const maleFocus = ["Burpees", "Lunges", "Bicep Curls"];
  const femaleFocus = ["Glute Bridge", "Lunges", "Crunches"];
  const picks =
    gender === "male"
      ? [...base, ...maleFocus]
      : gender === "female"
      ? [...base, ...femaleFocus]
      : [...base, "Lunges", "Crunches"];

  const exercises = picks.map((name, i) => ({
    name,
    sets,
    reps: name === "Plank" ? 1 : reps,
    restSeconds: 30,
    timerSeconds: name === "Plank" ? 30 + (SETS_BY_LEVEL[level] || 0) * 10 : null,
    videoUrl: VIDEO[name] || null,
    order: i,
  }));

  const dietPlan = {
    summary: `Balanced plan for goal: ${currentGoal || "general fitness"} (${gender}, ${level}).`,
    meals: [
      { meal: "Breakfast", suggestion: "Oats with fruit and eggs", calories: 450 },
      { meal: "Lunch", suggestion: "Grilled chicken, rice, vegetables", calories: 650 },
      { meal: "Dinner", suggestion: "Fish/lentils with salad", calories: 550 },
      { meal: "Snack", suggestion: "Greek yogurt and nuts", calories: 250 },
    ],
  };

  return {
    name: `${gender === "female" ? "Women's" : gender === "male" ? "Men's" : "Personalized"} ${level} plan`,
    category: "Strength",
    level,
    durationMin: 20 + sets * 5,
    caloriesEst: 200 + sets * 60,
    exercises,
    dietPlan,
    source: "rule-based",
  };
}

export async function generatePlan(profile) {
  const input = {
    gender: profile.gender || "other",
    level: profile.level || "easy",
    weight: profile.weight ?? null,
    age: profile.age ?? null,
    currentGoal: profile.currentGoal || null,
    targetGoal: profile.targetGoal || null,
  };

  if (!hasGemini()) return ruleBasedPlan(input);

  try {
    const prompt = `You are a certified fitness coach. Create a personalized workout and diet plan as STRICT JSON.
User: gender=${input.gender}, age=${input.age}, weight=${input.weight}kg, currentGoal="${input.currentGoal}", target="${input.targetGoal}", level=${input.level}.
IMPORTANT: tailor exercise selection to the user's gender.
Return JSON with this shape only:
{"name":string,"category":"Cardio"|"Strength"|"Flexibility","level":"${input.level}","durationMin":number,"caloriesEst":number,
"exercises":[{"name":string,"sets":number,"reps":number,"restSeconds":number,"timerSeconds":number|null,"videoUrl":string|null,"order":number}],
"dietPlan":{"summary":string,"meals":[{"meal":string,"suggestion":string,"calories":number}]}}`;

    const parsed = await geminiText(prompt, { json: true });
    parsed.exercises = (parsed.exercises || []).map((e, i) => ({
      ...e,
      order: e.order ?? i,
      videoUrl: e.videoUrl || VIDEO[e.name] || null,
    }));
    parsed.source = "llm";
    return parsed;
  } catch (err) {
    console.warn("planService LLM failed, falling back:", err.message);
    return ruleBasedPlan(input);
  }
}
