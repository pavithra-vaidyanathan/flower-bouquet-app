// lib/rulesEngine.ts
//
// The free, no-AI brain. Given the user's words it:
//   1. detects emotion categories from the lexicon (weighted)
//   2. picks flowers whose meanings match — with smart fallback so even
//      one or two words yields a full, sensible 4–6 flower bouquet
//   3. writes a warm layered "flower letter"
//
// Returns chosen flower names AND their friendly labels + why-chosen.

import { EMOTION_LEXICON, ALL_CATEGORIES, type EmotionCategory } from "./emotionLexicon";
import { FLOWERS, FLOWER_BY_NAME } from "./flowers";

const FLOWER_CATEGORIES: Record<string, EmotionCategory[]> = {
  rose: ["love", "romance", "longing"],
  peony: ["love", "apology", "admiration"],
  dahlia: ["admiration", "joy", "new_beginnings"],
  poppy: ["sympathy", "healing"],
  white_lily: ["sympathy", "new_beginnings", "healing"],
  sunflower: ["joy", "friendship", "hope"],
  hydrangea: ["gratitude", "apology"],
  iris: ["apology", "hope", "new_beginnings"],
  tulip: ["new_beginnings", "love", "apology"],
  cherry_blossom: ["nostalgia", "friendship", "new_beginnings"],
  daisy: ["friendship", "joy", "nostalgia"],
  lavender: ["sympathy", "healing", "gratitude"],
};

const SIZE_OF: Record<string, "large" | "medium" | "small"> = Object.fromEntries(
  FLOWERS.map((f) => [f.name, f.size])
);

// When an emotion is detected, these "cousin" emotions are gently implied too.
// This lets a sparse message ("miss you") still build a fuller story.
const RELATED: Record<EmotionCategory, EmotionCategory[]> = {
  love: ["romance", "longing", "admiration"],
  romance: ["love", "joy", "new_beginnings"],
  apology: ["love", "hope", "healing"],
  gratitude: ["admiration", "friendship", "joy"],
  sympathy: ["healing", "nostalgia", "longing"],
  joy: ["friendship", "admiration", "hope"],
  friendship: ["joy", "gratitude", "nostalgia"],
  hope: ["new_beginnings", "joy", "healing"],
  nostalgia: ["friendship", "longing", "love"],
  new_beginnings: ["hope", "joy", "admiration"],
  healing: ["sympathy", "hope", "gratitude"],
  longing: ["love", "nostalgia", "hope"],
  admiration: ["joy", "gratitude", "love"],
};

const MIN_FLOWERS = 4;
const MAX_FLOWERS = 6;

// ── 1. Detect emotions ──────────────────────────────────────────────────────────
export function detectEmotions(text: string): Record<EmotionCategory, number> {
  const lower =
    " " +
    text.toLowerCase().replace(/[^a-z'\s-]/g, " ").replace(/\s+/g, " ").trim() +
    " ";
  const tokens = new Set(lower.trim().split(" "));
  const scores = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<
    EmotionCategory,
    number
  >;
  for (const cat of ALL_CATEGORIES) {
    for (const term of EMOTION_LEXICON[cat]) {
      if (term.includes(" ")) {
        if (lower.includes(" " + term + " ")) scores[cat] += 2;
      } else {
        if (tokens.has(term)) scores[cat] += 1;
      }
    }
  }
  return scores;
}

// ── 2. Pick flowers (smart fallback + grief guard) ────────────────────────────────
export function pickFlowers(scores: Record<EmotionCategory, number>): string[] {
  // Soft echo of related emotions so faint input still resolves to a bouquet.
  const eff = { ...scores };
  for (const cat of ALL_CATEGORIES) {
    if (scores[cat] > 0) {
      for (const rel of RELATED[cat]) eff[rel] += scores[cat] * 0.4;
    }
  }

  // Grief guard: when sympathy clearly dominates, damp cheerful emotions so
  // funeral/loss bouquets stay gentle (no bright flowers sneaking in).
  const topCat = ALL_CATEGORIES.slice().sort((a, b) => eff[b] - eff[a])[0];
  if (topCat === "sympathy" && scores.sympathy >= 2) {
    eff.joy *= 0.2;
    eff.admiration *= 0.4;
    eff.romance *= 0.4;
  }

  const anyDetected = ALL_CATEGORIES.some((c) => scores[c] > 0);
  if (!anyDetected) {
    return ["peony", "daisy", "lavender", "hydrangea", "cherry_blossom"];
  }

  const flowerScore: Record<string, number> = {};
  for (const name of Object.keys(FLOWER_CATEGORIES)) {
    let s = 0;
    for (const cat of FLOWER_CATEGORIES[name]) s += eff[cat] || 0;
    if (s > 0) flowerScore[name] = s;
  }

  let chosen = Object.keys(flowerScore).sort(
    (a, b) => flowerScore[b] - flowerScore[a] || a.localeCompare(b)
  );

  if (!chosen.some((n) => SIZE_OF[n] === "large")) {
    const largeForCat = Object.keys(FLOWER_CATEGORIES).find(
      (n) => SIZE_OF[n] === "large" && FLOWER_CATEGORIES[n].includes(topCat)
    );
    chosen.unshift(largeForCat ?? "peony");
  }

  chosen = Array.from(new Set(chosen)).slice(0, MAX_FLOWERS);

  const fillers = ["lavender", "daisy", "hydrangea", "cherry_blossom", "white_lily", "tulip"];
  let fi = 0;
  while (chosen.length < MIN_FLOWERS && fi < fillers.length) {
    if (!chosen.includes(fillers[fi])) chosen.push(fillers[fi]);
    fi++;
  }
  return chosen;
}

// ── 3. Write the flower letter ────────────────────────────────────────────────────
const LINES: Record<EmotionCategory, string[]> = {
  love: [
    "We were gathered to say what the heart struggles to: you are loved.",
    "These blooms carry a love that did not know how else to reach you.",
  ],
  romance: [
    "We come as a small celebration of the two of you, and all the days ahead.",
    "Consider us a quiet toast to your love story.",
  ],
  apology: [
    "We arrive carrying an apology — gentle, sincere, and hoping to be heard.",
    "Think of us as an outstretched hand, asking softly for forgiveness.",
  ],
  gratitude: [
    "We were chosen to say thank you, for more than words alone could hold.",
    "We come bearing gratitude that has been waiting to be spoken.",
  ],
  sympathy: [
    "We come softly, to sit beside you in this heavy time.",
    "We were sent so you would not feel alone in your sorrow.",
  ],
  joy: [
    "We arrive cheering — there is something wonderful worth celebrating.",
    "Consider us a burst of joy, sent to mark a happy day.",
  ],
  friendship: [
    "We come as a reminder of a friendship that steadies and warms.",
    "We were gathered to say: you are a treasured friend.",
  ],
  hope: [
    "We carry a quiet hope, and the belief that brighter days are near.",
    "Take us as a wish for courage, and for everything ahead of you.",
  ],
  nostalgia: [
    "We hold a little of the past — the warm, remembered, tender kind.",
    "We come wrapped in fond memory, and the sweetness of time shared.",
  ],
  new_beginnings: [
    "We mark a beginning — a fresh page, opening just for you.",
    "Consider us a small send-off into something new and bright.",
  ],
  healing: [
    "We were sent gently, with wishes for rest and returning strength.",
    "Take us as a calm breath, and a hope that you heal softly.",
  ],
  longing: [
    "We cross the distance to say you are missed, and thought of often.",
    "We come in place of the closeness that the miles are keeping.",
  ],
  admiration: [
    "We were gathered in admiration of all you are and all you've done.",
    "Consider us a quiet round of applause, just for you.",
  ],
};

const CLOSERS = [
  "However we are read, may we make the moment a little softer.",
  "We were chosen with care, and we hope you feel it.",
  "Keep us close a while; we were sent only for you.",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function writeLetter(
  scores: Record<EmotionCategory, number>,
  seedText: string
): string {
  const ranked = ALL_CATEGORIES.map((c) => ({ cat: c, score: scores[c] }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const h = hash(seedText);
  if (ranked.length === 0) {
    return (
      "We come simply to say you are being thought of, today and gently. " +
      CLOSERS[h % CLOSERS.length]
    );
  }
  const top = ranked.slice(0, 3).map((r) => r.cat);
  const parts: string[] = [];
  top.forEach((cat, i) => {
    const opts = LINES[cat];
    parts.push(opts[(h + i) % opts.length]);
  });
  parts.push(CLOSERS[h % CLOSERS.length]);
  return parts.join(" ");
}

// ── One call that does it all ──────────────────────────────────────────────────────
export function composeBouquet(input: { feeling: string; note?: string }): {
  flowers: string[];
  message: string;
  chosen: { name: string; label: string; why: string }[];
} {
  const text = `${input.feeling} ${input.note ?? ""}`.trim();
  const scores = detectEmotions(text);
  const flowers = pickFlowers(scores);
  const message = writeLetter(scores, text);
  const chosen = flowers.map((n) => {
    const f = FLOWER_BY_NAME[n];
    return {
      name: n,
      label: f?.label ?? n,
      why: f ? f.meanings.slice(0, 2).join(", ") : "",
    };
  });
  return { flowers, message, chosen };
}
