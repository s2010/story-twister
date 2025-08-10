// Color-coded user bubble system - lighter backgrounds for better readability
const userColors = [
  "#B8D4E3", // Light Blue
  "#F8D3BB", // Light Orange
  "#D4C2E0", // Light Purple
  "#C8E6CA", // Light Green
  "#FFF3CD", // Light Yellow
  "#F7C2CC", // Light Pink
  "#D1ECF1", // Light Cyan
  "#E8D4F1", // Light Lavender
];

const userColorMap = new Map<string, string>();

export function getUserColor(username: string): string {
  if (userColorMap.has(username)) {
    return userColorMap.get(username)!;
  }

  // Generate a consistent color based on username hash
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const colorIndex = Math.abs(hash) % userColors.length;
  const color = userColors[colorIndex];

  userColorMap.set(username, color);
  return color;
}

export function hexToHsl(hex: string): string {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
