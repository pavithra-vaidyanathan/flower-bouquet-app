// app/api/bouquet/[id]/route.ts
//
// Reads one saved bouquet from Supabase and reshapes it into the exact
// payload shape BouquetView expects (to, from, emotion, messageHtml,
// letter, day/month/year, and flowers as {name, why, color}).

import { createClient } from "@supabase/supabase-js";
import { FLOWER_BY_NAME } from "@/lib/flowers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// A soft colour per flower for the little dot in "about this bouquet"
const FLOWER_COLORS: Record<string, string> = {
  rose: "#c95f7e",
  peony: "#e8aec2",
  dahlia: "#f0b89c",
  poppy: "#d6443f",
  white_lily: "#f3efe6",
  sunflower: "#e8b04a",
  hydrangea: "#8fb4d9",
  iris: "#9b7fc4",
  tulip: "#e07a92",
  cherry_blossom: "#f2c4cf",
  daisy: "#f5f0e4",
  lavender: "#a98fc9",
};

function parseDate(d?: string | null) {
  if (!d) return { day: null, month: null, year: null };
  // accepts "DD/MM/YYYY" or "YYYY-MM-DD"
  const slash = d.split("/");
  if (slash.length === 3) {
    return {
      day: Number(slash[0]) || null,
      month: Number(slash[1]) || null,
      year: Number(slash[2]) || null,
    };
  }
  const dash = d.split("-");
  if (dash.length === 3) {
    return {
      day: Number(dash[2]) || null,
      month: Number(dash[1]) || null,
      year: Number(dash[0]) || null,
    };
  }
  return { day: null, month: null, year: null };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from("bouquets")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return Response.json({ error: "Bouquet not found." }, { status: 404 });
  }

  const names: string[] = Array.isArray(data.flowers) ? data.flowers : [];

  // Reshape flowers into {name, why, color} for the meanings panel
  const flowers = names.map((n) => {
    const f = FLOWER_BY_NAME[n];
    return {
      name: f?.label ?? n,
      why: f ? f.meanings.slice(0, 2).join(", ") : "",
      color: FLOWER_COLORS[n] ?? "#cbb9a8",
      // keep the raw image key so BouquetCanvas can use it
      key: n,
    };
  });

  const { day, month, year } = parseDate(data.date);

  return Response.json({
    id: data.id,
    to: data.to_name ?? "",
    from: data.from_name ?? "",
    emotion: data.feeling ?? "",
    // the personal note the sender typed (shown in the note card)
    messageHtml: data.note ?? "",
    // the AI's flower letter (shown in "a letter from your bouquet")
    letter: data.message ?? "",
    day,
    month,
    year,
    flowers,
    // raw names array for the renderer
    flowerKeys: names,
  });
}
