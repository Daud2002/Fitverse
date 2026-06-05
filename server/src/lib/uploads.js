import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

function parseDataUrl(base64) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(base64);
  if (m) return { ext: extFromMime(m[1]), data: m[2] };
  return { ext: "jpg", data: base64 };
}

function extFromMime(mime) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

async function saveImageTo(segments, base64) {
  const { ext, data } = parseDataUrl(base64);
  const dir = path.join(UPLOADS_ROOT, ...segments);
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(data, "base64"));
  return `/uploads/${segments.join("/")}/${name}`;
}

export async function saveUserImage(userId, base64) {
  return saveImageTo([userId], base64);
}

export async function saveWorkoutImage(workoutId, base64) {
  return saveImageTo(["workout", workoutId], base64);
}
