import { config } from "../lib/config.js";

function endpoint() {
  return `${config.gemini.baseUrl}/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
}

function parseJson(text) {
  const cleaned = String(text)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

async function callGemini(parts, { json = false } = {}) {
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: json ? { responseMimeType: "application/json" } : {},
  };
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`gemini ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return extractText(await res.json());
}

export async function geminiText(prompt, { json = false } = {}) {
  const text = await callGemini([{ text: prompt }], { json });
  return json ? parseJson(text) : text;
}

export async function geminiVision(prompt, imageBase64, { json = false, mimeType = "image/jpeg" } = {}) {
  const text = await callGemini(
    [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
    { json }
  );
  return json ? parseJson(text) : text;
}
