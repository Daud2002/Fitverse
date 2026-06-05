import { HttpError } from "../lib/http.js";

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return next(new HttpError(400, msg));
  }
  req.body = result.data;
  next();
};
