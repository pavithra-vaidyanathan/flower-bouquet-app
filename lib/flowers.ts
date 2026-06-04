// lib/flowers.ts
//
// The emotional heart of the app. Each flower carries meanings and the
// emotions it suits, so the AI can combine them into a bouquet that tells
// a real story. Edit freely — add meanings, tweak emotions, change seasons.
//
// `name`      must match the PNG filename in /public/flowers/<name>.png
// `meanings`  what the flower symbolizes
// `emotions`  the feelings/occasions it fits (the AI matches on these)
// `bloom`     month numbers it's naturally in season (1 = Jan ... 12 = Dec)
// `size`      visual weight in the bouquet: "large" | "medium" | "small"

export type Flower = {
  name: string;
  label: string; // pretty name for the "about this bouquet" section
  meanings: string[];
  emotions: string[];
  bloom: number[];
  size: "large" | "medium" | "small";
};

export const FLOWERS: Flower[] = [
  {
    name: "rose",
    label: "Rose",
    meanings: ["love", "passion", "deep affection", "devotion"],
    emotions: ["romantic", "anniversary", "missing someone", "i love you"],
    bloom: [5, 6, 7, 8, 9],
    size: "large",
  },
  {
    name: "peony",
    label: "Peony",
    meanings: ["honor", "compassion", "a love that holds weight", "prosperity"],
    emotions: ["romantic", "remorse", "deep care", "you matter to me"],
    bloom: [4, 5, 6],
    size: "large",
  },
  {
    name: "dahlia",
    label: "Dahlia",
    meanings: ["dignity", "commitment", "standing strong", "inner grace"],
    emotions: ["pride", "celebration", "new chapter", "admiration"],
    bloom: [7, 8, 9, 10],
    size: "large",
  },
  {
    name: "poppy",
    label: "Poppy",
    meanings: ["remembrance", "comfort", "peace", "consolation"],
    emotions: ["sympathy", "loss", "healing", "thinking of you"],
    bloom: [5, 6, 7],
    size: "large",
  },
  {
    name: "white_lily",
    label: "White Lily",
    meanings: ["purity", "renewal", "restored peace", "the soul at rest"],
    emotions: ["sympathy", "loss", "fresh start", "forgiveness"],
    bloom: [6, 7, 8],
    size: "large",
  },
  {
    name: "sunflower",
    label: "Sunflower",
    meanings: ["warmth", "loyalty", "unwavering positivity", "adoration"],
    emotions: ["happiness", "friendship", "cheer up", "celebration"],
    bloom: [7, 8, 9],
    size: "large",
  },
  {
    name: "hydrangea",
    label: "Hydrangea",
    meanings: ["heartfelt gratitude", "understanding", "abundance"],
    emotions: ["thank you", "appreciation", "gratitude", "apology"],
    bloom: [6, 7, 8, 9],
    size: "medium",
  },
  {
    name: "iris",
    label: "Iris",
    meanings: ["hope", "courage", "faith", "a wish for the best"],
    emotions: ["apology", "encouragement", "hope", "good luck"],
    bloom: [4, 5, 6],
    size: "medium",
  },
  {
    name: "tulip",
    label: "Tulip",
    meanings: ["fresh love", "a clean slate", "cheerful sincerity"],
    emotions: ["new beginnings", "romantic", "spring", "i'm sorry"],
    bloom: [3, 4, 5],
    size: "medium",
  },
  {
    name: "cherry_blossom",
    label: "Cherry Blossom",
    meanings: ["fleeting beauty", "gentleness", "the preciousness of now"],
    emotions: ["nostalgia", "tenderness", "fresh start", "friendship"],
    bloom: [3, 4],
    size: "small",
  },
  {
    name: "daisy",
    label: "Daisy",
    meanings: ["innocence", "cheer", "loyal simplicity", "true feeling"],
    emotions: ["friendship", "happiness", "thinking of you", "lighthearted"],
    bloom: [4, 5, 6, 7, 8, 9],
    size: "small",
  },
  {
    name: "lavender",
    label: "Lavender",
    meanings: ["calm", "devotion", "grace", "quiet healing"],
    emotions: ["sympathy", "get well", "thank you", "serenity"],
    bloom: [6, 7, 8],
    size: "small",
  },
];

// Handy lookup by name
export const FLOWER_BY_NAME: Record<string, Flower> = Object.fromEntries(
  FLOWERS.map((f) => [f.name, f])
);
