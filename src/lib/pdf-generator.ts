/* ═══════════════════════════════════════════════════════════════════
   MediLink — consultation export (PDF).

   WHY THE BROWSER PRINT PIPELINE REPLACED jsPDF (FIX 1 — critical)
   ────────────────────────────────────────────────────────────────
   jsPDF's built-in fonts (helvetica, times, courier) are the PDF
   standard-14 fonts: they are WinAnsi/Standard encoded and cover
   Latin-1 only. The export never called `doc.addFont(...)`, so no
   Unicode font was embedded and every Bangla character was written as
   mojibake / empty boxes — the PDF was unreadable for the exact
   audience this product serves (Bangla / Banglish first).

   jsPDF can only draw Unicode through an embedded TTF, and shipping a
   Bengali font binary is not something we can do reliably here. So the
   transcript is handed to the browser's own print pipeline instead:
   the system fonts (the app already loads Hind Siliguri through
   next/font/google) render Bangla perfectly, and the patient saves the
   result with "Save as PDF" from the print dialog. A print-scoped
   stylesheet keeps everything but the transcript off the paper.

   Bonus (FIX 5): dropping jsPDF also removes the whole PDF engine from
   the client bundle — this module is now a few kB of DOM code, so the
   static import in chat/page.tsx stays cheap.

   The exported function name and signature are unchanged, so the chat
   page keeps working exactly as before.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  ChatSession,
  ConsultationSummary,
  MedicationSchedule,
  Profile,
} from "@/types";

/* ────────────────────────────────────────────────────────────────────
   1. Constants
   ──────────────────────────────────────────────────────────────────── */

const PRINT_ROOT_ID = "medilink-print-root";
const PRINT_STYLE_ID = "medilink-print-style";

/** Exact disclaimer strings required by the spec (last_prompt.md §3.2 / §7.2). */
const FLASH_DISCLAIMER = "⚠️ AI guidance only — not a doctor.";
const PRO_DISCLAIMER =
  "⚠️ Disclaimer: I am an AI, not a doctor. For a proper diagnosis, book a doctor on MediLink.";

/** Kept as a separate line, next to (not merged into) the disclaimer. */
const EMERGENCY_LINE = "🚨 In case of emergency, call 999 immediately.";

/**
 * Code points of the situation emoji from the spec (§5 Situation Color
 * Contract). Code points are used instead of the glyphs so the check
 * cannot be broken by a missing / extra variation selector.
 */
const SITUATION_EMOJI_CODEPOINTS = new Set<number>([
  0x1f6a8, // 🚨 emergency
  0x26a0, // ⚠️ caution / disclaimer
  0x2705, // ✅ safe action
  0x1f912, // 🤒 info
  0x1f37d, // 🍽️ eat / avoid
  0x23f3, // ⏳ timeframes
  0x1f3e5, // 🏥 next step
  0x26a1, // ⚡ quick answer
]);

/**
 * A leading emoji cluster: one base emoji plus any variation selector,
 * skin-tone modifier or zero-width-joiner chain that follows it.
 */
const EMOJI_CLUSTER_RE =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator})(?:\uFE0F|\u20E3|\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})|\p{Emoji_Modifier})*/u;

/* ────────────────────────────────────────────────────────────────────
   2. Plain-text transform (spec §6.5)
   ──────────────────────────────────────────────────────────────────── */

export type TranscriptBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[] };

/** Removes markdown emphasis, code fences, link syntax and heading hashes. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`{1,3}/g, "") // inline code spans + code fences
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1") // ***bold italic***
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/\*([^*\n]+)\*/g, "$1") // *italic*
    .replace(/(^|[\s(\[])_([^_\n]+)_(?=$|[\s)\].,!?;:])/g, "$1$2") // _italic_
    .replace(/~~([^~]+)~~/g, "$1") // ~~strikethrough~~
    .trim();
}

/** Removes every leading emoji cluster (plus the spaces after it) from a line. */
function stripLeadingEmoji(line: string): string {
  let out = line.replace(/^\s+/, "");
  for (;;) {
    const match = EMOJI_CLUSTER_RE.exec(out);
    if (!match || match[0].length === 0) break;
    out = out.slice(match[0].length).replace(/^\s+/, "");
  }
  return out;
}

/** Code point of the first emoji of a line, or null when it does not start with one. */
function leadingEmojiCodePoint(line: string): number | null {
  const match = EMOJI_CLUSTER_RE.exec(line.replace(/^\s+/, ""));
  if (!match || match[0].length === 0) return null;
  const codePoint = match[0].codePointAt(0);
  return codePoint === undefined ? null : codePoint;
}

/**
 * Converts one markdown table row into the readable plain-text form
 * `a | b` — no leading / trailing pipes. Divider rows return null.
 */
function parseTableRow(line: string): string | null {
  let body = line.trim();
  if (!body.includes("|")) return null;
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);

  const cells = body.split("|").map((cell) => stripInlineMarkdown(cell.trim()));
  if (cells.length === 0) return null;

  // `|---|---|` style divider rows are dropped, never printed.
  if (cells.every((cell) => cell === "" || /^:?-+:?$/.test(cell))) return null;

  return cells.join(" | ");
}

/**
 * Parses an assistant message into structured, plain-text blocks:
 * markdown symbols and emoji prefixes are stripped, section names become
 * UPPERCASE labels, list markers are kept and table rows are flattened to
 * `a | b`.
 */
export function parseTranscript(content: string): TranscriptBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: TranscriptBlock[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let tableRows: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.map((line) => line.trim()).filter(Boolean).join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ type: "paragraph", text });
  };

  const flushList = () => {
    if (!list) return;
    if (list.items.length > 0) {
      blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  const flushTable = () => {
    if (tableRows.length > 0) blocks.push({ type: "table", rows: tableRows });
    tableRows = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushTable();
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Blank line: paragraph break (excessive blank lines collapse away).
    if (trimmed.length === 0) {
      flushAll();
      continue;
    }

    // Code fences and horizontal rules carry no meaning in a plain-text export.
    if (/^(?:```|~~~)/.test(trimmed) || /^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      continue;
    }

    // Table row.
    if (trimmed.startsWith("|")) {
      flushParagraph();
      flushList();
      const row = parseTableRow(trimmed);
      if (row) tableRows.push(row);
      continue;
    }

    // Blockquote: the marker is dropped, the text is kept.
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      flushList();
      flushTable();
      const text = stripInlineMarkdown(quote[1]);
      if (text) blocks.push({ type: "paragraph", text });
      continue;
    }

    // Ordered / unordered list items — the markers are kept (they are plain text).
    const orderedMatch = /^(\d{1,3})[.)]\s+(.*)$/.exec(trimmed);
    const bulletMatch = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (orderedMatch || bulletMatch) {
      flushParagraph();
      flushTable();
      const ordered = orderedMatch !== null;
      const raw = orderedMatch ? orderedMatch[2] : bulletMatch ? bulletMatch[1] : "";
      const text = stripInlineMarkdown(raw);
      if (!text) continue;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(text);
      continue;
    }

    // Markdown heading -> UPPERCASE label.
    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const text = stripInlineMarkdown(heading[1]);
      if (text) blocks.push({ type: "heading", text: text.toUpperCase() });
      continue;
    }

    // Emoji-prefixed line: a section label (UPPERCASE) or a plain sentence.
    const emojiCodePoint = leadingEmojiCodePoint(trimmed);
    if (emojiCodePoint !== null) {
      flushAll();
      const text = stripInlineMarkdown(stripLeadingEmoji(trimmed));
      if (!text) continue;
      const isSituationEmoji = SITUATION_EMOJI_CODEPOINTS.has(emojiCodePoint);
      const looksLikeLabel = text.length <= 70 && !/[.!?।…]$/.test(text);
      if (isSituationEmoji && looksLikeLabel) {
        blocks.push({ type: "heading", text: text.toUpperCase() });
      } else {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }

    // Ordinary paragraph line.
    flushList();
    flushTable();
    paragraph.push(stripInlineMarkdown(trimmed));
  }

  flushAll();
  return blocks;
}

/**
 * User bubbles stay plain text (no markdown rendering): the text is kept
 * verbatim — only a leading emoji prefix is removed — and blank-line groups
 * become separate paragraphs.
 */
export function parseUserMessage(content: string): TranscriptBlock[] {
  const normalized = content.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  return normalized
    .split(/\n{2,}/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => stripLeadingEmoji(line))
        .join("\n")
        .trim()
    )
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => ({ type: "paragraph" as const, text: chunk }));
}

/** Flattens parsed blocks back into the plain-text transcript form. */
export function toPlainText(blocks: TranscriptBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return block.text.toUpperCase();
        case "paragraph":
          return block.text;
        case "list":
          return block.items
            .map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${item}`)
            .join("\n");
        case "table":
          return block.rows.join("\n");
        default:
          return "";
      }
    })
    .filter((chunk) => chunk.length > 0)
    .join("\n\n");
}

/* ────────────────────────────────────────────────────────────────────
   3. Markup helpers
   ──────────────────────────────────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Renders parsed blocks as real headings / lists / paragraphs (not one blob). */
function renderBlocks(blocks: TranscriptBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h4 class="mlp-heading">${escapeHtml(block.text)}</h4>`;
        case "paragraph":
          return `<p class="mlp-para">${escapeHtml(block.text)}</p>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const items = block.items
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("");
          return `<${tag} class="mlp-list">${items}</${tag}>`;
        }
        case "table": {
          const rows = block.rows
            .map((row) => `<p class="mlp-table-row">${escapeHtml(row)}</p>`)
            .join("");
          return `<div class="mlp-table">${rows}</div>`;
        }
        default:
          return "";
      }
    })
    .join("");
}

/* ────────────────────────────────────────────────────────────────────
   4. Print stylesheet (scoped to the generated transcript)
   ──────────────────────────────────────────────────────────────────── */

const PRINT_CSS = `
/* On screen the transcript never shows — it exists only for printing. */
#${PRINT_ROOT_ID} { display: none !important; }

@media print {
  @page { size: A4 portrait; margin: 16mm 14mm; }

  html, body {
    background: #ffffff !important;
    color: #1a2b4c !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Only the transcript reaches the paper. */
  body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }

  #${PRINT_ROOT_ID} {
    display: block !important;
    position: static !important;
    float: none !important;
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #1a2b4c !important;
    font-family: var(--font-bengali), "Hind Siliguri", "Noto Sans Bengali", Vrinda, system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    /* FIX 3: long names / areas / headings wrap instead of running off the page. */
    overflow-wrap: anywhere;
    word-break: break-word;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  #${PRINT_ROOT_ID} * {
    font-family: inherit;
    box-shadow: none;
    text-shadow: none;
  }

  #${PRINT_ROOT_ID} .mlp-title {
    margin: 0 0 8pt;
    padding: 8pt 10pt;
    background: #17786f;
    color: #ffffff;
    font-size: 15pt;
    font-weight: 700;
    border-radius: 3pt;
  }

  #${PRINT_ROOT_ID} .mlp-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2pt 18pt;
    margin: 0 0 8pt;
    font-size: 9pt;
    color: #5b6b85;
  }

  #${PRINT_ROOT_ID} .mlp-meta-key { font-weight: 600; }

  #${PRINT_ROOT_ID} .mlp-session {
    margin: 0 0 8pt;
    font-size: 12.5pt;
    font-weight: 700;
    color: #1a2b4c;
  }

  #${PRINT_ROOT_ID} .mlp-profile {
    margin: 0 0 10pt;
    padding: 8pt 10pt;
    border: 1px solid #d9e6f2;
    background: #f0faf6;
    border-radius: 4pt;
  }

  #${PRINT_ROOT_ID} .mlp-summary {
    margin: 0 0 10pt;
    padding: 8pt 10pt;
    border: 1px solid #d9e6f2;
    border-left: 3pt solid #17786f;
    background: #ffffff;
    border-radius: 4pt;
    page-break-inside: avoid;
  }

  #${PRINT_ROOT_ID} .mlp-summary-title {
    margin: 0 0 5pt;
    font-size: 9pt;
    font-weight: 700;
    color: #1a2b4c;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  #${PRINT_ROOT_ID} .mlp-summary-note {
    margin: 5pt 0 0;
    font-size: 7.5pt;
    font-style: italic;
    color: #5b6b85;
    line-height: 1.4;
  }

  #${PRINT_ROOT_ID} .mlp-med-list {
    margin: 0;
    padding-left: 12pt;
    font-size: 8.5pt;
    color: #1a2b4c;
  }

  #${PRINT_ROOT_ID} .mlp-med-item {
    margin: 0 0 2.5pt;
    line-height: 1.4;
  }

  #${PRINT_ROOT_ID} .mlp-profile-title {
    margin: 0 0 4pt;
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #17786f;
  }

  #${PRINT_ROOT_ID} .mlp-profile-list { margin: 0; }

  #${PRINT_ROOT_ID} .mlp-profile-row {
    display: flex;
    flex-wrap: wrap;
    gap: 2pt 8pt;
    font-size: 10pt;
  }

  #${PRINT_ROOT_ID} .mlp-profile-row dt {
    font-weight: 600;
    color: #5b6b85;
    min-width: 32mm;
  }

  #${PRINT_ROOT_ID} .mlp-profile-row dd {
    margin: 0;
    flex: 1 1 40mm;
  }

  #${PRINT_ROOT_ID} .mlp-message {
    margin: 0 0 10pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  #${PRINT_ROOT_ID} .mlp-speaker {
    margin: 0 0 3pt;
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1a2b4c;
  }

  #${PRINT_ROOT_ID} .mlp-message-user .mlp-speaker { color: #17786f; }

  #${PRINT_ROOT_ID} .mlp-heading {
    margin: 8pt 0 3pt;
    padding-bottom: 1pt;
    border-bottom: 0.5pt solid #d9e6f2;
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a2b4c;
    page-break-after: avoid;
    break-after: avoid;
  }

  #${PRINT_ROOT_ID} .mlp-para { margin: 0 0 4pt; }

  /* Tailwind's preflight removes list markers — put them back. */
  #${PRINT_ROOT_ID} ol {
    list-style: decimal outside;
    margin: 0 0 5pt 16pt;
    padding-left: 12pt;
  }

  #${PRINT_ROOT_ID} ul {
    list-style: disc outside;
    margin: 0 0 5pt 16pt;
    padding-left: 12pt;
  }

  #${PRINT_ROOT_ID} li { margin: 0 0 2pt; }

  #${PRINT_ROOT_ID} .mlp-table { margin: 0 0 5pt; }

  #${PRINT_ROOT_ID} .mlp-table-row {
    margin: 0 0 2pt;
    padding: 2pt 6pt;
    border-left: 2pt solid #e6f4f1;
    font-size: 10pt;
  }

  #${PRINT_ROOT_ID} .mlp-footer {
    margin: 8pt 0 0;
    padding-top: 6pt;
    border-top: 1px solid #d9e6f2;
    font-size: 8.5pt;
    color: #5b6b85;
  }

  #${PRINT_ROOT_ID} .mlp-footer p { margin: 0 0 2pt; }

  #${PRINT_ROOT_ID} .mlp-emergency { font-weight: 700; color: #b42318; }
}
`;

/* ────────────────────────────────────────────────────────────────────
   5. Transcript document
   ──────────────────────────────────────────────────────────────────── */

function buildTranscriptHtml(
  session: ChatSession,
  profile?: Profile | null,
  clinicalSummary?: ConsultationSummary | null,
  medicationSchedules?: MedicationSchedule[],
): string {
  const generatedAt = new Date().toLocaleString("en-GB");
  const modelLabel =
    session.modelUsed === "med1-pro" ? "Med-1 Pro (Detailed)" : "Med-1 Flash (Quick)";
  // FIX 4: the exact disclaimer string for the mode this session used.
  const disclaimer = session.modelUsed === "med1-pro" ? PRO_DISCLAIMER : FLASH_DISCLAIMER;

  const profileBlock =
    profile && profile.name
      ? `<section class="mlp-profile">
          <h3 class="mlp-profile-title">Patient</h3>
          <dl class="mlp-profile-list">
            <div class="mlp-profile-row">
              <dt>Name</dt>
              <dd>${escapeHtml(profile.name)}</dd>
            </div>
            <div class="mlp-profile-row">
              <dt>Area</dt>
              <dd>${escapeHtml(profile.area || "Area not set")}</dd>
            </div>
            <div class="mlp-profile-row">
              <dt>Known Conditions</dt>
              <dd>${escapeHtml(
                profile.diseases && profile.diseases.length > 0
                  ? profile.diseases.join(", ")
                  : "None reported"
              )}</dd>
            </div>
            <div class="mlp-profile-row">
              <dt>Allergies</dt>
              <dd>${escapeHtml(
                profile.allergies && profile.allergies.length > 0
                  ? profile.allergies.join(", ")
                  : "None reported"
              )}</dd>
            </div>
          </dl>
        </section>`
      : "";

  const messages = session.messages
    .map((message) => {
      const isUser = message.role === "user";
      const blocks = isUser ? parseUserMessage(message.content) : parseTranscript(message.content);
      return `<article class="mlp-message ${isUser ? "mlp-message-user" : "mlp-message-ai"}">
          <h3 class="mlp-speaker">${isUser ? "You" : "Dr MediLink"}</h3>
          ${renderBlocks(blocks)}
        </article>`;
    })
    .join("");

  /* ── Clinical handover summary ───────────────────────────────────
     The same summary the patient can send to a doctor, so the
     printed report and the WhatsApp handover never disagree. */
  const summaryBlock = clinicalSummary
    ? `<section class="mlp-summary">
        <h3 class="mlp-summary-title">Summary for your doctor</h3>
        <dl class="mlp-profile-list">
          <div class="mlp-profile-row">
            <dt>Chief complaint</dt>
            <dd>${escapeHtml(clinicalSummary.chiefComplaint)}</dd>
          </div>
          <div class="mlp-profile-row">
            <dt>Duration</dt>
            <dd>${escapeHtml(clinicalSummary.duration)}</dd>
          </div>
          <div class="mlp-profile-row">
            <dt>Severity</dt>
            <dd>${escapeHtml(clinicalSummary.severity)}</dd>
          </div>
          ${
            clinicalSummary.symptoms.length
              ? `<div class="mlp-profile-row">
                  <dt>Symptoms</dt>
                  <dd>${escapeHtml(
                    clinicalSummary.symptoms
                      .map(
                        (symptom) =>
                          `${symptom.name}${
                            symptom.severity !== "unknown" ? ` (${symptom.severity})` : ""
                          }${symptom.duration ? ` — ${symptom.duration}` : ""}`,
                      )
                      .join("; "),
                  )}</dd>
                </div>`
              : ""
          }
          ${
            clinicalSummary.currentMedications.length
              ? `<div class="mlp-profile-row">
                  <dt>Current medications</dt>
                  <dd>${escapeHtml(
                    clinicalSummary.currentMedications
                      .map((medication) =>
                        [
                          medication.name,
                          medication.dose,
                          medication.frequency,
                        ]
                          .filter(Boolean)
                          .join(", "),
                      )
                      .join("; "),
                  )}</dd>
                </div>`
              : ""
          }
          <div class="mlp-profile-row">
            <dt>Allergies</dt>
            <dd>${escapeHtml(
              clinicalSummary.allergies.length ? clinicalSummary.allergies.join(", ") : "None",
            )}</dd>
          </div>
          ${
            clinicalSummary.redFlags.length
              ? `<div class="mlp-profile-row">
                  <dt>Red flags</dt>
                  <dd>${escapeHtml(clinicalSummary.redFlags.join(", "))}</dd>
                </div>`
              : ""
          }
        </dl>
        <p class="mlp-summary-note">Prepared from your chat with Dr MediLink. This is not a diagnosis — your doctor will verify everything with you.</p>
      </section>`
    : "";

  /* ── Dose reminders ─────────────────────────────────────────────── */
  const medicationBlock =
    medicationSchedules && medicationSchedules.length
      ? `<section class="mlp-summary">
          <h3 class="mlp-summary-title">Dose reminders</h3>
          <ul class="mlp-med-list">
            ${medicationSchedules
              .map(
                (schedule) => `<li class="mlp-med-item">
                  <strong>${escapeHtml(schedule.name)}</strong> — ${escapeHtml(schedule.dose)}
                  ${
                    schedule.clockTimes?.length
                      ? ` · ${escapeHtml(schedule.clockTimes.join(", "))}`
                      : ""
                  }
                  ${schedule.durationDays ? ` · ${schedule.durationDays} day(s)` : ""}
                </li>`,
              )
              .join("")}
          </ul>
          <p class="mlp-summary-note">Taken from your chat with Dr MediLink. Always follow your prescription or the medicine label.</p>
        </section>`
      : "";

  return `<article class="mlp-doc">
      <header class="mlp-header">
        <h1 class="mlp-title">MediLink — AI Health Guidance Report</h1>
        <div class="mlp-meta">
          <span class="mlp-meta-item"><span class="mlp-meta-key">Generated:</span> ${escapeHtml(
            generatedAt
          )}</span>
          <span class="mlp-meta-item"><span class="mlp-meta-key">Model:</span> ${escapeHtml(
            modelLabel
          )}</span>
        </div>
        <h2 class="mlp-session">${escapeHtml(session.title || "Consultation Transcript")}</h2>
      </header>
      ${profileBlock}
      ${summaryBlock}
      ${medicationBlock}
      <section class="mlp-transcript">${messages}</section>
      <footer class="mlp-footer">
        <p class="mlp-disclaimer">${escapeHtml(disclaimer)}</p>
        <p class="mlp-emergency">${escapeHtml(EMERGENCY_LINE)}</p>
      </footer>
    </article>`;
}

/* ────────────────────────────────────────────────────────────────────
   6. Export entry point
   ──────────────────────────────────────────────────────────────────── */

/**
 * Exports a consultation. The transcript is rendered into a hidden,
 * print-scoped container and the browser print dialog is opened, so the
 * patient saves it with "Save as PDF" (see the note at the top of this
 * file for why jsPDF was dropped).
 */
export function exportChatToPDF(
  session: ChatSession,
  profile?: Profile | null,
  clinicalSummary?: ConsultationSummary | null,
  medicationSchedules?: MedicationSchedule[],
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!document.body || !document.head) return;

  // A previous transcript (repeat export) must not be printed twice.
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();

  const previousTitle = document.title;
  // The print dialog uses the document title as the default file name.
  const printTitle = `MediLink Consultation — ${session.title || "chat"}`;
  document.title = printTitle;

  const styleElement = document.createElement("style");
  styleElement.id = PRINT_STYLE_ID;
  styleElement.textContent = PRINT_CSS;
  document.head.appendChild(styleElement);

  const root = document.createElement("div");
  root.id = PRINT_ROOT_ID;
  root.style.display = "none";
  root.innerHTML = buildTranscriptHtml(
    session,
    profile,
    clinicalSummary,
    medicationSchedules,
  );
  document.body.appendChild(root);

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    // Only ever remove the nodes this export created — a second export may
    // already have replaced them.
    if (root.parentNode) root.parentNode.removeChild(root);
    if (styleElement.parentNode) styleElement.parentNode.removeChild(styleElement);
    if (document.title === printTitle) document.title = previousTitle;
  };

  window.addEventListener("afterprint", cleanup);
  // Safety net for browsers that never fire `afterprint`.
  window.setTimeout(cleanup, 120000);

  const print = () => {
    try {
      window.print();
    } catch {
      // Printing can be blocked (sandboxed frame, denied permission) —
      // there is nothing else we can do from here.
    }
  };

  // Wait for the Bangla webfont so the preview is not typeset in a fallback face.
  const fontsReady =
    typeof document.fonts !== "undefined" ? document.fonts.ready : undefined;
  if (fontsReady) {
    fontsReady.then(() => window.setTimeout(print, 60)).catch(() => window.setTimeout(print, 60));
  } else {
    window.setTimeout(print, 60);
  }
}
