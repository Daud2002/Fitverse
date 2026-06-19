import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 2002,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Maintenance kill-switch. When false, the mobile app blocks all access and force-logs-out.
  // Defaults to true so a missing/unset value never locks everyone out by accident.
  letThemWork: process.env.LET_THEM_WORK !== "false",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },
  // OpenAI-compatible chat LLM (recommendations + coach). Defaults to OpenRouter.
  // Accepts OPENROUTER_* or legacy GROQ_* env vars so either provider works.
  groq: {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || "",
    baseUrl:
      process.env.OPENROUTER_BASE_URL ||
      process.env.GROQ_BASE_URL ||
      "https://openrouter.ai/api/v1",
    model:
      process.env.OPENROUTER_MODEL ||
      process.env.GROQ_MODEL ||
      "google/gemma-4-31b-it:free",
    // Native JSON response_format. Off by default — most free models reject it,
    // and we coax/parse JSON from the prompt instead. Set LLM_JSON_MODE=true on
    // providers that support it (e.g. Groq) for stricter output.
    jsonMode: process.env.LLM_JSON_MODE === "true",
  },
  usda: {
    apiKey: process.env.USDA_API_KEY || "",
    baseUrl: process.env.USDA_BASE_URL || "https://api.nal.usda.gov/fdc/v1",
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || "",
    token: process.env.TWILIO_AUTH_TOKEN || "",
    from: process.env.TWILIO_FROM_NUMBER || "",
  },
  googleMapsKey: process.env.GOOGLE_MAPS_KEY || "",
};

export const hasGemini = () => Boolean(config.gemini.apiKey);
export const hasGroq = () => Boolean(config.groq.apiKey);
export const hasUsda = () => Boolean(config.usda.apiKey);
export const hasTwilio = () =>
  Boolean(config.twilio.sid && config.twilio.token && config.twilio.from);
