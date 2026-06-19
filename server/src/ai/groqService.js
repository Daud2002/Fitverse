import { config } from "../lib/config.js";

function endpoint() {
  return `${config.groq.baseUrl}/chat/completions`;
}

function parseJson(text) {
  const cleaned = String(text)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Some models wrap JSON in prose — grab the outermost {...} block.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("could not parse JSON from model output");
  }
}

function extractText(data) {
  return (data?.choices?.[0]?.message?.content || "").trim();
}

// messages: [{ role: "system"|"user"|"assistant", content: string }]
export async function groqChat(messages, { json = false } = {}) {
  const body = {
    model: config.groq.model,
    messages,
    temperature: 0.7,
  };
  // Many free OpenRouter models reject response_format. Only send it when explicitly
  // enabled (LLM_JSON_MODE=true); otherwise we rely on prompt instructions + parseJson.
  if (json && config.groq.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groq.apiKey}`,
      // OpenRouter uses these for app attribution; harmless for other providers.
      "HTTP-Referer": "https://fitverse.app",
      "X-Title": "FitVerse",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`groq ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const text = extractText(await res.json());
  return json ? parseJson(text) : text;
}

// Streams an assistant reply as text deltas. `onDelta(chunk)` is called for each token chunk.
// Returns the full accumulated text. Throws on transport/HTTP error before the first chunk.
export async function groqChatStream(messages, onDelta) {
  const body = {
    model: config.groq.model,
    messages,
    temperature: 0.7,
    stream: true,
  };

  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groq.apiKey}`,
      "HTTP-Referer": "https://fitverse.app",
      "X-Title": "FitVerse",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`groq ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  // OpenAI-compatible SSE: lines of "data: {json}\n\n", terminated by "data: [DONE]".
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return full;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // Ignore keep-alive comments / partial frames.
      }
    }
  }
  return full;
}
