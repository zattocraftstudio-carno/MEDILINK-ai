"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { DoseTimerPanel } from "@/components/medication/DoseTimerPanel";
import { registerServiceWorker } from "@/lib/notifications";
import { useMedicationStore } from "@/stores/useMedicationStore";
import { ArrowLeft, Plus } from "lucide-react";

export default function MedicationsPage() {
  // Tier-2 notifications need the service worker registered.
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  const count = useMedicationStore(
    (s) => s.schedules.filter((schedule) => schedule.status === "active").length,
  );

  return (
    <div className="min-h-screen bg-bg-main">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-bg-main/95 backdrop-blur border-b border-border-soft">
        <div className="max-w-[720px] mx-auto px-4 md:px-8">
          <div className="h-14 flex items-center gap-2">
            <Link
              href="/chat"
              aria-label="Back to chat"
              className="w-11 h-11 -ml-2 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <h1 className="text-[17px] font-bold text-text-primary">My reminders</h1>
            {count > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-light text-[12px] font-bold text-brand">
                {count}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="max-w-[720px] mx-auto px-4 md:px-8 py-5">
        <DoseTimerPanel />
      </main>
    </div>
  );
}
