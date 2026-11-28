// The one definition of a "word" (05-RESEARCH "Don't Hand-Roll"): whitespace-separated tokens.
// Shared by the content validator (step words) and `npm run review:screens` (rendered step words),
// so the two counts cannot drift apart. Erasable TypeScript only.

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w !== "").length;
}
