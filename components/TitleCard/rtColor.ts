export function rtColor(score: number): string {
  if (score >= 75) return "#fa320a";
  if (score >= 60) return "#f5c518";
  return "#757575";
}
