import { config, hasGemini, hasUsda } from "../lib/config.js";
import { geminiVision } from "./geminiService.js";

const USDA_NUTRIENT = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

const DEMO_FOODS = [
  { name: "Grilled Chicken Salad", calories: 380, protein: 35, carbs: 18, fat: 16, confidence: 0.94 },
  { name: "Scrambled Eggs", calories: 220, protein: 18, carbs: 2, fat: 15, confidence: 0.9 },
  { name: "Whole Wheat Toast", calories: 140, protein: 5, carbs: 26, fat: 2, confidence: 0.88 },
  { name: "Oatmeal with Banana", calories: 310, protein: 8, carbs: 54, fat: 6, confidence: 0.91 },
];

async function recognizeFoodLabel(imageBase64) {
  if (!hasGemini()) {
    const idx = (imageBase64?.length || 0) % DEMO_FOODS.length;
    return { label: DEMO_FOODS[idx].name, confidence: DEMO_FOODS[idx].confidence, demo: true };
  }
  const parsed = await geminiVision(
    'Identify the single food dish in this image. Reply as JSON: {"label":string,"confidence":number 0..1}.',
    imageBase64,
    { json: true }
  );
  return { label: parsed.label, confidence: parsed.confidence ?? 0.8, demo: false };
}

function usdaNutrient(food, id) {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id || x.nutrient?.id === id);
  return Math.round(n?.value || n?.amount || 0);
}

async function nutritionFor(label) {
  if (!hasUsda()) {
    const match = DEMO_FOODS.find((f) => f.name.toLowerCase() === label.toLowerCase()) || DEMO_FOODS[0];
    return { calories: match.calories, protein: match.protein, carbs: match.carbs, fat: match.fat, demo: true };
  }
  const url = `${config.usda.baseUrl}/foods/search?api_key=${config.usda.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: label, pageSize: 1, dataType: ["Survey (FNDDS)", "SR Legacy", "Foundation", "Branded"] }),
  });
  if (!res.ok) throw new Error(`usda ${res.status}`);
  const data = await res.json();
  const food = data.foods?.[0];
  if (!food) throw new Error(`usda: no match for "${label}"`);
  return {
    calories: usdaNutrient(food, USDA_NUTRIENT.calories),
    protein: usdaNutrient(food, USDA_NUTRIENT.protein),
    carbs: usdaNutrient(food, USDA_NUTRIENT.carbs),
    fat: usdaNutrient(food, USDA_NUTRIENT.fat),
    demo: false,
  };
}

export async function recognizeMeal(imageBase64) {
  try {
    const { label, confidence } = await recognizeFoodLabel(imageBase64);
    console.log(`Vision recognized: ${label} (confidence ${confidence})`);
    const macros = await nutritionFor(label);
    console.log(`Nutrition lookup for "${label}": ${macros.calories} kcal, P${macros.protein} C${macros.carbs} F${macros.fat}`);
    return {
      name: label,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      confidence,
    };
  } catch (err) {
    console.warn("visionService failed, returning demo result:", err.message);
    const f = DEMO_FOODS[0];
    return { name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, confidence: f.confidence };
  }
}
