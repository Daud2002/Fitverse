import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 2002,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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
export const hasUsda = () => Boolean(config.usda.apiKey);
export const hasTwilio = () =>
  Boolean(config.twilio.sid && config.twilio.token && config.twilio.from);
