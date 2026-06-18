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
    return { isFood: true, label: DEMO_FOODS[idx].name, confidence: DEMO_FOODS[idx].confidence, demo: true };
  }
  const parsed = await geminiVision(
    'You are a food recognition system. Look at this image. ' +
      'Set "isFood" to true ONLY if the image clearly shows an edible food, meal, dish, or drink. ' +
      'Set "isFood" to false for anything else (people, animals, objects, scenery, screenshots, ' +
      'text, packaging with no visible food, or anything not clearly edible). ' +
      'Reply ONLY as JSON: {"isFood":boolean,"label":string,"confidence":number 0..1}. ' +
      'When isFood is false, "label" may be empty.',
    imageBase64,
    { json: true }
  );
  return {
    isFood: parsed.isFood !== false,
    label: parsed.label,
    confidence: parsed.confidence ?? 0.8,
    demo: false,
  };
}

function usdaNutrient(food, id) {
  const n = food.foodNutrients?.find((x) => x.nutrientId === id || x.nutrient?.id === id);
  return Math.round(n?.value || n?.amount || 0);
}

// Parse the four macros (per 100g, USDA's standard reference basis) out of a USDA food record.
export function macrosFromUsdaFood(food) {
  return {
    calories: usdaNutrient(food, USDA_NUTRIENT.calories),
    protein: usdaNutrient(food, USDA_NUTRIENT.protein),
    carbs: usdaNutrient(food, USDA_NUTRIENT.carbs),
    fat: usdaNutrient(food, USDA_NUTRIENT.fat),
  };
}

// Paginated USDA food search for the manual-tracking catalog. Returns lightweight items with
// per-100g macros plus pagination metadata mirroring USDA's own response.
export async function searchFoods(query, { page = 1, pageSize = 20 } = {}) {
  if (!hasUsda()) throw new Error("USDA search is not configured");
  const url = `${config.usda.baseUrl}/foods/search?api_key=${config.usda.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageNumber: page,
      pageSize,
      dataType: ["Survey (FNDDS)", "SR Legacy", "Foundation", "Branded"],
    }),
  });
  if (!res.ok) throw new Error(`usda ${res.status}`);
  const data = await res.json();
  const items = (data.foods || []).map((food) => ({
    fdcId: food.fdcId,
    name: food.description,
    per100g: macrosFromUsdaFood(food),
  }));
  return {
    items,
    page: data.currentPage || page,
    totalPages: data.totalPages || 1,
    totalHits: data.totalHits || items.length,
  };
}

// Look up per-100g nutrition for a food name via USDA (falls back to demo data without a key).
export async function nutritionPer100g(label) {
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
  return { ...macrosFromUsdaFood(food), demo: false };
}

export async function recognizeMeal(imageBase64) {
  const { isFood, label, confidence } = await recognizeFoodLabel(imageBase64);
  if (!isFood) {
    console.log("Vision: no food detected in image");
    return { isFood: false };
  }
  console.log(`Vision recognized: ${label} (confidence ${confidence})`);
  const macros = await nutritionPer100g(label);
  console.log(`Nutrition lookup for "${label}": ${macros.calories} kcal, P${macros.protein} C${macros.carbs} F${macros.fat}`);
  return {
    isFood: true,
    name: label,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    confidence,
  };
}
