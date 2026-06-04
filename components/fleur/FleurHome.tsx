"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { LandingCartSvg } from "./LandingCartSvg";
import type { BouquetPayload, FlowerMeaning } from "@/lib/types";

const STORAGE_PREFIX = "fleur_bouquet_";

export function FleurHome() {
  const router = useRouter();
  const messageRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);

  const formatText = useCallback((cmd: "bold" | "italic") => {
    messageRef.current?.focus();
    document.execCommand(cmd, false);
    if (cmd === "bold") setBoldActive((a) => !a);
    else setItalicActive((a) => !a);
  }, []);

  async function generateBouquet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const to = String(fd.get("to") ?? "").trim();
    const from = String(fd.get("from") ?? "").trim();
    const emotion = String(fd.get("emotion") ?? "").trim();
    const day = String(fd.get("day") ?? "").trim();
    const month = String(fd.get("month") ?? "").trim();
    const year = String(fd.get("year") ?? "").trim();
    const messageHtml = messageRef.current?.innerHTML ?? "";

    // require all five fields
    const errs: Record<string, boolean> = {};
    if (!to) errs.to = true;
    if (!from) errs.from = true;
    if (!emotion) errs.emotion = true;
    if (!day || !month || !year) errs.date = true;
    if (!messageHtml.replace(/<[^>]*>/g, "").trim()) errs.note = true;

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in every field before tying your bouquet.");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toName: to,
          fromName: from,
          feeling: emotion,
          note: messageHtml,
          date: day && month && year ? `${day}/${month}/${year}` : "",
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Something went wrong. Try again.",
        );
      }

      const id = json.id;
      if (typeof id !== "string" || !id) {
        throw new Error("Invalid response from server.");
      }

      const persisted = Boolean(json.persisted);
      const flowersRaw = json.flowers;
      const flowers = Array.isArray(flowersRaw)
        ? flowersRaw.filter(
            (f): f is FlowerMeaning =>
              typeof f === "object" &&
              f !== null &&
              typeof (f as FlowerMeaning).name === "string" &&
              typeof (f as FlowerMeaning).why === "string" &&
              typeof (f as FlowerMeaning).color === "string",
          )
        : [];

        const snapshot: BouquetPayload = {
          to: String(json.to ?? ""),
          from: String(json.from ?? ""),
          emotion: String(json.emotion ?? ""),
          messageHtml: String(json.messageHtml ?? ""),
          day: typeof json.day === "number" ? json.day : null,
          month: typeof json.month === "number" ? json.month : null,
          year: typeof json.year === "number" ? json.year : null,
          letter: String(json.letter ?? ""),
          flowers,
          flowerKeys: Array.isArray((json as any).flowerKeys) ? (json as any).flowerKeys : [],
        };

      if (!persisted) {
        sessionStorage.setItem(
          `${STORAGE_PREFIX}${id}`,
          JSON.stringify(snapshot),
        );
      }

      router.push(`/bouquet/${id}`);
    } catch (err) {
      setIsSubmitting(false);
      setFormError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <>
      <section
        id="landing"
        className="page"
        style={{ display: isSubmitting ? "none" : undefined }}
      >
        <div className="landing-text">
          <h1 className="main-heading fade-in">
            bouquet
            <br />
            <em>de fleurs</em>
          </h1>
          <p className="sub-heading fade-in">
            when words fall short,
            <br />
            send flowers with them
          </p>
          <Link href="#input-section" className="scroll-cue fade-in">
            <span className="scroll-arrow" />
            begin
          </Link>
        </div>

        <div className="cart-wrap fade-in">
          <LandingCartSvg />
        </div>
      </section>

      <section
        id="input-section"
        className="page"
        style={{ display: isSubmitting ? "none" : undefined }}
      >
        <div className="section-header">
          <div className="section-number">compose your bouquet</div>
          <h2 className="section-title">what do you wish to say?</h2>
        </div>

        <form className="form-wrap" onSubmit={generateBouquet}>
          <div className="field-group-row">
            <div className="field-group-half">
              <label className="field-label" htmlFor="toInput">
                to
              </label>
              <input
                type="text"
                id="toInput"
                name="to"
                placeholder="their name..."
                style={fieldErrors.to ? { borderColor: "#b06" } : undefined}
              />
            </div>
            <div className="field-group-half">
              <label className="field-label" htmlFor="fromInput">
                from
              </label>
              <input
                type="text"
                id="fromInput"
                name="from"
                placeholder="your name..."
                style={fieldErrors.from ? { borderColor: "#b06" } : undefined}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">the feeling</label>
            <p className="field-prompt">
              why are you sending flowers? what do you hope they feel when they
              receive them?
            </p>
            <textarea
              className="emotion-textarea"
              id="emotionInput"
              name="emotion"
              placeholder="perhaps you want them to know they are not alone..."
              rows={5}
              style={fieldErrors.emotion ? { borderColor: "#b06" } : undefined}
            />
          </div>

          <div className="field-group">
            <label className="field-label">the date</label>
            <p className="field-prompt">when should these flowers arrive?</p>
            <div className="date-row">
              <div className="date-field">
                <span className="date-sublabel">day</span>
                <input
                  type="number"
                  id="dateDay"
                  name="day"
                  placeholder="—"
                  min={1}
                  max={31}
                  style={fieldErrors.date ? { borderColor: "#b06" } : undefined}
                />
              </div>
              <div className="date-field">
                <span className="date-sublabel">month</span>
                <input
                  type="number"
                  id="dateMonth"
                  name="month"
                  placeholder="—"
                  min={1}
                  max={12}
                  style={fieldErrors.date ? { borderColor: "#b06" } : undefined}
                />
              </div>
              <div className="date-field">
                <span className="date-sublabel">year</span>
                <input
                  type="number"
                  id="dateYear"
                  name="year"
                  placeholder="——"
                  min={2024}
                  max={2030}
                  style={fieldErrors.date ? { borderColor: "#b06" } : undefined}
                />
              </div>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">your note</label>
            <p className="field-prompt">
              write a few words to accompany the bouquet
            </p>
            <div className="message-toolbar">
              <button
                type="button"
                className={`fmt-btn${boldActive ? " active" : ""}`}
                id="boldBtn"
                onClick={() => formatText("bold")}
                title="Bold"
              >
                <b>B</b>
              </button>
              <button
                type="button"
                className={`fmt-btn${italicActive ? " active" : ""}`}
                id="italicBtn"
                onClick={() => formatText("italic")}
                title="Italic"
              >
                <i>I</i>
              </button>
            </div>
            <div
              ref={messageRef}
              className="message-area"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="a few words, or many..."
              style={fieldErrors.note ? { borderColor: "#b06" } : undefined}
            />
          </div>

          {formError ? (
            <p
              style={{
                textAlign: "center",
                color: "#8a4a4a",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              {formError}
            </p>
          ) : null}

          <div className="cta-wrap">
            <button type="submit" className="cta-btn" disabled={isSubmitting}>
              <span>✦ tie a bouquet</span>
            </button>
            <span className="cta-note">your flowers are chosen with care</span>
            <a
              className="cta-note"
              href="https://www.linkedin.com/in/pavithravaidyanathan"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                borderBottom: "0.5px solid currentColor",
                paddingBottom: 2,
              }}
            >
              made by pavithra vaidyanathan
            </a>
          </div>
        </form>
      </section>

      <div id="loading-page" className={isSubmitting ? "active" : ""}>
        <div className="loading-bouquet">
          <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" fill="none">
            <path
              d="M60 200 L40 240 L160 240 L140 200 Z"
              fill="#f0e8d5"
              stroke="#3a342e"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M60 200 L50 175 L150 175 L140 200 Z"
              fill="#e8ddc8"
              stroke="#3a342e"
              strokeWidth="1.2"
            />
            <line x1="90" y1="175" x2="85" y2="80" stroke="#5a7a5a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="100" y1="175" x2="100" y2="60" stroke="#5a7a5a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="112" y1="175" x2="118" y2="75" stroke="#5a7a5a" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="80" y1="175" x2="72" y2="90" stroke="#5a7a5a" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="122" y1="175" x2="130" y2="85" stroke="#5a7a5a" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="85" cy="75" r="14" fill="#e8a882" opacity="0.88" />
            <circle cx="100" cy="55" r="16" fill="#d4a0b8" opacity="0.88" />
            <circle cx="118" cy="70" r="13" fill="#e8d080" opacity="0.88" />
            <circle cx="70" cy="85" r="10" fill="#a8c8a0" opacity="0.8" />
            <circle cx="132" cy="80" r="11" fill="#d4a0a0" opacity="0.8" />
            <path d="M90 130 Q80 120 76 108" stroke="#6a8a5a" strokeWidth="1" fill="none" />
            <path d="M112 125 Q122 115 126 103" stroke="#6a8a5a" strokeWidth="1" fill="none" />
            <path d="M70 190 Q100 185 130 190" stroke="#c8a0a0" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div className="loading-text">gathering your flowers</div>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </>
  );
}