import { verifyToken } from "../lib/jwt.js";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new HttpError(401, "Unauthorized");
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new HttpError(401, "Unauthorized");
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, "Unauthorized"));
  }
}

export function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new HttpError(403, "Admin access required"));
  }
  next();
}
