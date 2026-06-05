export const colors = {
  primary: "#6C5CE7",
  primaryDark: "#5A4BD4",
  blue: "#4A6CF7",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  green: "#22C55E",
  red: "#EF4444",
  bg: "#F4F5F9",
  card: "#FFFFFF",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

export const gradients = {
  primary: ["#4A6CF7", "#8B5CF6", "#C026D3"],
  header: ["#4A6CF7", "#8B5CF6"],
  orange: ["#F97316", "#EF4444"],
  green: ["#16A34A", "#22C55E"],
  card: ["#5B6CF9", "#8B5CF6"],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const tabGradientFor = (key) =>
  ({
    challenge: gradients.orange,
    sos: gradients.orange,
  }[key] || gradients.primary);
