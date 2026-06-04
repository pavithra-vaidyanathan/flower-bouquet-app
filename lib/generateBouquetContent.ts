import Anthropic from "@anthropic-ai/sdk";
import type { FlowerMeaning } from "./types";

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : trimmed).trim();
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object from model");
  }
  return parsed as Record<string, unknown>;
}

function asFlowerMeaning(x: unknown): FlowerMeaning | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const why = typeof o.why === "string" ? o.why.trim() : "";
  const color = typeof o.color === "string" ? o.color.trim() : "#8a8070";
  if (!name || !why) return null;
  return { name, why, color };
}

export async function generateLetterAndFlowers(input: {
  to: string;
  from: string;
  emotion: string;
  messagePlainHint: string;
}): Promise<{ letter: string; flowers: FlowerMeaning[] }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "your_key_here") {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({ apiKey: key });
  const model =
    process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

  const userBlock = `You help compose a digital flower bouquet. Given the sender's context, respond with ONLY valid JSON (no markdown outside the JSON) matching this shape:
{"letter":"string — 2 to 4 short paragraphs, first person plural (we/the flowers speaking together to the recipient), gentle and literary, no flower names in the letter body","flowers":[{"name":"common flower name","why":"one sentence why this bloom fits the occasion","color":"#RRGGBB hex accent"}]}
Rules:
- flowers: exactly 5 items, varied species, realistic florist choices.
- why lines echo the emotional brief without repeating the note verbatim.
- letter must not list flower names; keep it one cohesive voice.

Recipient (to): ${input.to || "(unspecified)"}
Sender signing as: ${input.from || "(unspecified)"}
Emotional context / occasion: ${input.emotion || "(not specified)"}
Note to inform tone (do not quote it directly): ${input.messagePlainHint || "(empty)"}`;

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    messages: [{ role: "user", content: userBlock }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from model");
  }

  const obj = extractJsonObject(textBlock.text);
  const letter =
    typeof obj.letter === "string" ? obj.letter.trim() : "";
  const rawFlowers = obj.flowers;
  const flowers: FlowerMeaning[] = [];
  if (Array.isArray(rawFlowers)) {
    for (const item of rawFlowers) {
      const f = asFlowerMeaning(item);
      if (f) flowers.push(f);
    }
  }

  if (!letter) {
    throw new Error("Model returned empty letter");
  }
  if (flowers.length === 0) {
    throw new Error("Model returned no flowers");
  }

  return { letter, flowers };
}
