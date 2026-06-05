export function isValidPhone(value) {
  return typeof value === "string" && /^0\d{10}$/.test(value.trim());
}

export function normalizePhone(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function toIntlPhone(value) {
  const v = normalizePhone(value);
  if (/^0\d{10}$/.test(v)) return `+92${v.slice(1)}`;
  return v;
}
