/**
 * Shared palette of 24 visually distinct colors for user identification.
 * Used on Kanban cards, task assignments, and the Family page color picker.
 */
export const USER_COLOR_PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#f43f5e', // rose
  '#fb923c', // light-orange
  '#84cc16', // lime
  '#4ade80', // light-green
  '#2dd4bf', // light-teal
  '#38bdf8', // light-sky
  '#818cf8', // light-indigo
  '#c084fc', // light-purple
  '#fb7185', // light-rose
  '#a3e635', // yellow-green
  '#34d399', // emerald
] as const;

export type UserColor = typeof USER_COLOR_PALETTE[number];

/**
 * Given the set of colors already taken by existing family members,
 * returns the first available color from the palette.
 * Falls back to the first palette color if all are taken.
 */
export function assignUniqueColor(takenColors: string[]): string {
  const taken = new Set(takenColors.map((c) => c.toLowerCase()));
  for (const color of USER_COLOR_PALETTE) {
    if (!taken.has(color.toLowerCase())) return color;
  }
  // Palette exhausted — wrap around
  return USER_COLOR_PALETTE[takenColors.length % USER_COLOR_PALETTE.length];
}
