// app/api/generate/route.ts
//
// FREE version — uses the local rules engine instead of the Anthropic API.
// No API key, no billing. Same database write as before, so the result page
// and BouquetCanvas work unchanged.

import { createClient } from "@supabase/supabase-js";
import { composeBouquet } from "@/lib/rulesEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const feeling: string = (body.feeling ?? body.emotion ?? "").trim();
    const toName: string | undefined = body.toName;
    const fromName: string | undefined = body.fromName;
    const note: string | undefined = body.note;
    const date: string | undefined = body.date;

    if (!feeling) {
      return Response.json({ error: "Please describe the feeling." }, { status: 400 });
    }

    // ── The brain: rules engine picks flowers + writes the letter ──
    const { flowers, message } = composeBouquet({ feeling, note });

    // ── Save to Supabase (same shape as before) ──
    const { data, error } = await supabase
      .from("bouquets")
      .insert({
        feeling,
        to_name: toName ?? null,
        from_name: fromName ?? null,
        note: note ?? null,
        date: date ?? null,
        flowers,
        message,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return Response.json({ error: "Could not save the bouquet." }, { status: 500 });
    }

    return Response.json({ id: data.id, flowers, message });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
