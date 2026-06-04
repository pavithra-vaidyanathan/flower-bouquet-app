"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BouquetCanvas from "@/components/BouquetCanvas";
import type { BouquetPayload, FlowerMeaning } from "@/lib/types";

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const STORAGE_PREFIX = "fleur_bouquet_";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatStamp(p: BouquetPayload): string {
  const m = p.month ?? new Date().getMonth() + 1;
  const d = p.day ?? new Date().getDate();
  const y = p.year ?? new Date().getFullYear();
  return `composed on ${d} ${months[Math.min(12, Math.max(1, m)) - 1]} ${y}`;
}
function shortDate(p: BouquetPayload): string {
  const m = p.month ?? new Date().getMonth() + 1;
  const d = p.day ?? new Date().getDate();
  const y = p.year ?? new Date().getFullYear();
  return `${d} ${months[Math.min(12, Math.max(1, m)) - 1]} ${y}`;
}

type Props = { bouquetId: string };

export function BouquetView({ bouquetId }: Props) {
  const [data, setData] = useState<BouquetPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState<"share bouquet" | "✦ link copied">("share bouquet");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bouquet/${bouquetId}`);
        if (res.ok) {
          const json = (await res.json()) as BouquetPayload & { id?: string };
          if (!cancelled) {
            setData({
              to: String(json.to ?? ""),
              from: String(json.from ?? ""),
              emotion: String(json.emotion ?? ""),
              messageHtml: String(json.messageHtml ?? ""),
              day: typeof json.day === "number" ? json.day : null,
              month: typeof json.month === "number" ? json.month : null,
              year: typeof json.year === "number" ? json.year : null,
              letter: String(json.letter ?? ""),
              flowers: Array.isArray(json.flowers) ? (json.flowers as FlowerMeaning[]) : [],
              flowerKeys: Array.isArray((json as any).flowerKeys) ? (json as any).flowerKeys : [],
            });
          }
          return;
        }
      } catch { /* fall through */ }
      try {
        const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${bouquetId}`);
        if (raw) { const json = JSON.parse(raw) as BouquetPayload; if (!cancelled) setData(json); return; }
      } catch { /* ignore */ }
      if (!cancelled) setLoadError("We could not find this bouquet.");
    })();
    return () => { cancelled = true; };
  }, [bouquetId]);

  async function copyLink() {
    const url = `${window.location.origin}/bouquet/${bouquetId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("✦ link copied");
      window.setTimeout(() => setShareLabel("share bouquet"), 2000);
    } catch { setShareLabel("share bouquet"); }
  }

  // loading
  if (loadError === null && data === null) {
    return (
      <div id="loading-page" className="active">
        <div className="loading-text">opening your bouquet</div>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }
  // error
  if (loadError) {
    return (
      <div className="res-page active">
        <div className="res-nav">
        <Link href="/" className="res-logo">Pavi&apos;s flower shop</Link>
        </div>
        <div className="res-stage">
          <p style={{ fontStyle: "italic", color: "var(--ink-muted)" }}>{loadError}</p>
          <Link href="/" className="res-btn">← make another</Link>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const flowers = data.flowers ?? [];
  const toName = data.to?.trim() || "you";
  const fromName = data.from?.trim() || "—";

  return (
    <div className="res-page active">
      <nav className="res-nav">
        <Link href="/" className="res-logo">Pavi&apos;s flower shop</Link>
        <div className="res-actions">
          <Link href="/" className="res-btn">← make another</Link>
          <button type="button" className="res-btn" onClick={() => void copyLink()}>{shareLabel}</button>
        </div>
      </nav>

      <div className="res-stage">
        {/* for <name> */}
        <div className="res-to">for <b>{toName}</b></div>

        {/* big bouquet */}
        <div className="bq-area">
          <div className="bq">
            <BouquetCanvas flowers={data.flowerKeys ?? []} seed={seedFromId(bouquetId)} />
          </div>
        </div>

        <button type="button" className={`about-toggle${aboutOpen ? " open" : ""}`} onClick={() => setAboutOpen((o) => !o)}>
          <span className="about-ic">+</span> about this bouquet
        </button>

        {/* about panel — expands below the toggle */}
        <div className={`about-panel${aboutOpen ? " open" : ""}`}>
          {flowers.map((f) => (
            <div key={f.name + f.why} className="about-row">
              <div className="dot" style={{ background: f.color }} />
              <div>
                <span className="fname">{f.name}</span>
                <span className="fwhy">{f.why}</span>
              </div>
            </div>
          ))}
        </div>

        {/* POSTCARD */}
        <div className="pc">
          <div className="pc-divider" />
          <div className="pc-left">
            <div className="pc-msg" dangerouslySetInnerHTML={{ __html: data.messageHtml?.trim() || "<em>no note included</em>" }} />
          </div>
          <div className="pc-right">
            <img className="pc-stamp" src="/bouquet/stamp.png" alt="stamp" />
            <svg className="pc-postmark" viewBox="0 0 78 46" fill="none">
              <path d="M2 9 Q15 3 28 9 T54 9 T76 9" stroke="#8a8278" strokeWidth="1.7" fill="none" />
              <path d="M2 18 Q15 12 28 18 T54 18 T76 18" stroke="#8a8278" strokeWidth="1.7" fill="none" />
              <path d="M2 27 Q15 21 28 27 T54 27 T76 27" stroke="#8a8278" strokeWidth="1.7" fill="none" />
              <path d="M2 36 Q15 30 28 36 T54 36 T76 36" stroke="#8a8278" strokeWidth="1.7" fill="none" />
            </svg>
            <div className="pc-addr">
              <div className="pc-field"><span className="pc-label">TO :</span><span className="pc-line">{toName}</span></div>
              <div className="pc-field"><span className="pc-label">FROM :</span><span className="pc-line">{fromName}</span></div>
              <div className="pc-field"><span className="pc-label">DATED :</span><span className="pc-line">{shortDate(data)}</span></div>
            </div>
          </div>
        </div>

        {/* LETTER */}
        <div className="res-letter">
          <div className="res-letter-title">✦ a letter from your bouquet</div>
          <div className="res-letter-text">
            {data.letter.split(/\n\n+/).map((para, i) => (
              <p key={i} style={{ marginBottom: "0.8em" }}>{para}</p>
            ))}
          </div>
          <div className="res-date">{formatStamp(data)}</div>
        </div>
      </div>
    </div>
  );
}
