// lib/prompt.ts
//
// Builds the instruction we send to Claude. It hands Claude the full flower
// list (with meanings + emotions), the user's words, and the current month,
// then asks for a strict JSON response: which flowers + a poetic message.

import { FLOWERS } from "./flowers";

export function buildBouquetPrompt(opts: {
  feeling: string; // the user's emotional description
  toName?: string;
  fromName?: string;
  note?: string; // the personal note they wrote
  month: number; // 1-12, current month for seasonal preference
}) {
  const { feeling, toName, fromName, note, month } = opts;

  // Compact flower catalogue for the prompt
  const catalogue = FLOWERS.map((f) => ({
    name: f.name,
    meanings: f.meanings,
    emotions: f.emotions,
    inSeason: f.bloom.includes(month),
    size: f.size,
  }));

  return `You are a poetic floral designer with deep knowledge of flower symbolism.
You build bouquets that tell a complete emotional story — not random picks.

The sender wants to express this:
"""${feeling}"""
${note ? `\nThey also wrote this personal note: """${note}"""` : ""}
${toName ? `\nThe bouquet is for: ${toName}` : ""}
${fromName ? `\nIt is from: ${fromName}` : ""}

Today's month number is ${month}. Gently prefer flowers that are in season,
but always choose meaning over season when a flower is emotionally essential.

Here is the ONLY set of flowers you may choose from:
${JSON.stringify(catalogue, null, 2)}

Choose 4 to 7 flowers (by their "name") that TOGETHER tell the emotional story.
Layer the emotions — if the feeling is complex (e.g. apology + love + gratitude),
pick flowers that each carry a different part of it. Vary the sizes so the
bouquet has visual structure (include at least one or two "large" flowers).

Then write a short, warm "flower letter" — 2 to 4 sentences, written as if the
flowers themselves are speaking to the recipient. Make it feel personal and
heartfelt, never generic. Do not list the flower names in the letter.

Respond with ONLY valid JSON, no markdown, no backticks, in EXACTLY this shape:
{
  "flowers": ["name1", "name2", "name3"],
  "message": "the flower letter here",
  "reasoning": "one short sentence on why this combination fits"
}`;
}
