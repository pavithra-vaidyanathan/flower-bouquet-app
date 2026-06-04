// app/api/generate/route.ts
//
// The endpoint the input form calls. Flow:
//   1. read the user's feeling/note/to/from from the request
//   2. ask Claude to pick flowers + write the message
//   3. validate Claude's JSON against our real flower list
//   4. save the bouquet to Supabase and return its id

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { buildBouquetPrompt } from "@/lib/prompt";
import { FLOWER_BY_NAME } from "@/lib/flowers";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const feeling: string = (body.feeling ?? body.occasion ?? "").trim();
    const toName: string | undefined = body.toName;
    const fromName: string | undefined = body.fromName;
    const note: string | undefined = body.note;
    const date: string | undefined = body.date;

    if (!feeling) {
      return Response.json({ error: "Please describe the feeling." }, { status: 400 });
    }

    const month = new Date().getMonth() + 1; // 1-12

    // ── Ask Claude ──
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: buildBouquetPrompt({ feeling, toName, fromName, note, month }),
        },
      ],
    });

    // Pull the text out and parse the JSON (strip stray backticks just in case)
    const raw = completion.content
      .map((c: any) => (c.type === "text" ? c.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let parsed: { flowers: string[]; message: string; reasoning?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "The florist got tongue-tied. Please try again." },
        { status: 502 }
      );
    }

    // ── Validate: keep only flowers that actually exist in our set ──
    const validFlowers = (parsed.flowers || []).filter((n) => FLOWER_BY_NAME[n]);
    if (validFlowers.length < 3) {
      // safety net so the bouquet never looks sparse
      validFlowers.push("rose", "lavender", "daisy");
    }
    const flowers = Array.from(new Set(validFlowers)).slice(0, 7);

    // ── Save to Supabase ──
    const { data, error } = await supabase
      .from("bouquets")
      .insert({
        feeling,
        to_name: toName ?? null,
        from_name: fromName ?? null,
        note: note ?? null,
        date: date ?? null,
        flowers, // JSON array
        message: parsed.message ?? "",
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return Response.json({ error: "Could not save the bouquet." }, { status: 500 });
    }

    return Response.json({
      id: data.id,
      flowers,
      message: parsed.message,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
