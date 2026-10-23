import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChatSession } from "@/types";
import {
  Download,
  MessageSquare,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { searchSessions, type SessionMatch } from "@/lib/chat-search";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onDownloadSession: (id: string) => void;
  isPremium: boolean;
}

/** Highlights the matched slice without re-running the search. */
const Highlight: React.FC<{ text: string; start: number; length: number }> = ({
  text,
  start,
  length,
}) => {
  if (start < 0 || length <= 0 || start >= text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-accent-soft text-text-primary rounded-sm px-0.5">
        {text.slice(start, start + length)}
      </mark>
      {text.slice(start + length)}
    </>
  );
};

/** Two-line clamped snippet — no Tailwind line-clamp plugin required. */
const snippetStyle: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onDownloadSession,
  isPremium,
}) => {
  const [query, setQuery] = useState("");

  // Free plan only sees the last 3. Search runs on THIS list, never on
  // the full history — otherwise search would leak locked chats.
  const displaySessions = useMemo(
    () => (isPremium ? sessions : sessions.slice(0, 3)),
    [isPremium, sessions],
  );

  const matches = useMemo(
    () => searchSessions(displaySessions, query),
    [displaySessions, query],
  );

  // A closed drawer should not remember what the patient searched for.
  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const hasQuery = query.trim().length > 0;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Chat History">
      <div className="flex flex-col h-full bg-bg-main p-4">
        {!isPremium && sessions.length > 3 && (
          <div className="mb-4 p-3 bg-accent-soft rounded-lg text-[13px] text-text-primary border border-accent/20">
            <strong>Free Plan limits history to the last 3 chats.</strong> Upgrade to Premium to unlock your full history and PDF exports.
          </div>
        )}

        {displaySessions.length > 0 && (
          <div className="mb-3">
            <div className="relative">
              <label htmlFor="chat-history-search" className="sr-only">
                Search chat history
              </label>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                aria-hidden="true"
              />
              <input
                id="chat-history-search"
                type="search"
                autoComplete="off"
                placeholder="Search chats and messages..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setQuery("");
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                className="w-full h-10 pl-9 pr-9 rounded-md border-[1.5px] border-border bg-white text-[14px] text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-soft"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {hasQuery && (
              <p
                className="mt-1.5 text-[12px] text-text-muted"
                aria-live="polite"
              >
                {matches.length === 0
                  ? "No matches"
                  : `${matches.length} of ${displaySessions.length} chats`}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {displaySessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <h4 className="font-bold text-[16px] text-text-primary mb-1">
                No conversations yet
              </h4>
              <p className="text-[13px] text-text-muted">
                Start a new chat and it will appear here.
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 px-4">
              <h4 className="font-bold text-[16px] text-text-primary mb-1">
                No chats match “{query.trim()}”
              </h4>
              <p className="text-[13px] text-text-muted mb-3">
                Try a medicine name, a symptom, or a word from the conversation.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[13px] font-semibold text-brand hover:text-brand-dark"
              >
                Clear search
              </button>
            </div>
          ) : (
            matches.map(({ session, matchedIn, snippet, highlightStart, highlightLength }: SessionMatch) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                  activeSessionId === session.id
                    ? "bg-white border-brand shadow-sm"
                    : "bg-white border-border-soft hover:border-brand-light"
                }`}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activeSessionId === session.id ? "bg-brand-light text-brand" : "bg-bg-soft text-text-muted"
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-text-primary truncate">
                      {matchedIn === "title" ? (
                        <Highlight
                          text={session.title}
                          start={highlightStart}
                          length={highlightLength}
                        />
                      ) : (
                        session.title
                      )}
                    </div>
                    <div className="text-[12.5px] text-text-muted">
                      {new Date(session.createdAt).toLocaleDateString()} · {session.modelUsed === "med1-pro" ? "Pro" : "Flash"}
                    </div>
                    {matchedIn === "message" && snippet && (
                      <div
                        className="text-[13px] text-text-muted mt-0.5 break-words leading-snug"
                        style={snippetStyle}
                      >
                        <Highlight
                          text={snippet}
                          start={highlightStart}
                          length={highlightLength}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {isPremium && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDownloadSession(session.id); }}
                      className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-brand hover:bg-brand-light rounded-md"
                      aria-label="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                    className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-emergency hover:bg-emergency-soft rounded-md"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
};
