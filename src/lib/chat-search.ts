/* ═══════════════════════════════════════════════════════════════════
   MediLink — chat history search.

   Pure, synchronous, dependency-free. The drawer calls this with the
   sessions the plan allows the patient to see (the free plan only
   exposes its last three), so a search can never reveal a locked chat.

   Both English and Bangla work: `toLowerCase()` is a no-op for Bangla,
   and `indexOf` compares code units, which is correct for the scripts
   MediLink handles.
   ═══════════════════════════════════════════════════════════════════ */

import type { ChatSession } from "@/types";

/** Longest query we will process — prevents pathological inputs. */
export const MAX_QUERY_LENGTH = 80;

/** Characters of context shown on each side of a message match. */
export const SNIPPET_RADIUS = 40;

export interface SessionMatch {
  session: ChatSession;
  /** Where the query was found. `null` when the query is empty. */
  matchedIn: "title" | "message" | null;
  /** Context around a message match. `null` for title matches. */
  snippet: string | null;
  /**
   * Index of the query in the text the UI will highlight:
   *   • `matchedIn === "title"`   → index inside `session.title`
   *   • `matchedIn === "message"` → index inside `snippet`
   *   • otherwise                 → -1
   */
  highlightStart: number;
  highlightLength: number;
}

export function normalizeQuery(query: string): string {
  return query.trim().slice(0, MAX_QUERY_LENGTH).toLowerCase();
}

function makeSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

/**
 * Filters sessions by title or by any message body.
 *
 * A title match wins over a message match (the title is what the
 * patient recognises). Otherwise the newest matching message supplies
 * the snippet, so the result shows the most recent relevant context.
 */
export function searchSessions(
  sessions: ChatSession[],
  query: string,
): SessionMatch[] {
  const needle = normalizeQuery(query);

  if (!needle) {
    return sessions.map((session) => ({
      session,
      matchedIn: null,
      snippet: null,
      highlightStart: -1,
      highlightLength: 0,
    }));
  }

  const matches: SessionMatch[] = [];

  for (const session of sessions) {
    const title = session.title ?? "";
    const titleIndex = title.toLowerCase().indexOf(needle);

    if (titleIndex !== -1) {
      matches.push({
        session,
        matchedIn: "title",
        snippet: null,
        highlightStart: titleIndex,
        highlightLength: needle.length,
      });
      continue;
    }

    const messages = session.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i]?.content;
      if (typeof content !== "string" || !content) continue;

      const index = content.toLowerCase().indexOf(needle);
      if (index === -1) continue;

      const snippet = makeSnippet(content, index, needle.length);
      matches.push({
        session,
        matchedIn: "message",
        snippet,
        // The snippet was rebuilt, so locate the needle inside it rather
        // than reusing the offset from the full message.
        highlightStart: snippet.toLowerCase().indexOf(needle),
        highlightLength: needle.length,
      });
      break;
    }
  }

  return matches;
}
