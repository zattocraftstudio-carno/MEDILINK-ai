"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  useHealthLogStore,
  HEALTH_LOG_LABELS,
} from "@/stores/useHealthLogStore";
import { HealthLogType, HealthLogEntry } from "@/types";
import { Activity, Plus, Trash2, TrendingUp, Heart, CheckCircle2 } from "lucide-react";

interface HealthLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthLogModal: React.FC<HealthLogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { logs, addLog, deleteLog } = useHealthLogStore();
  const [selectedType, setSelectedType] = useState<HealthLogType>("bp");

  // Form states
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [value, setValue] = useState("");
  const [context, setContext] = useState<"fasting" | "post_meal" | "random" | "resting">("random");
  const [note, setNote] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const typeLogs = logs.filter((l) => l.type === selectedType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === "bp") {
      const sys = Number(systolic);
      const dia = Number(diastolic);
      if (!sys || !dia || sys <= 0 || dia <= 0) return;

      addLog({
        type: "bp",
        systolic: sys,
        diastolic: dia,
        note: note.trim() || undefined,
      });
      setSystolic("");
      setDiastolic("");
    } else {
      const val = Number(value);
      if (!val || val <= 0) return;

      addLog({
        type: selectedType,
        value: val,
        context: selectedType === "sugar" ? context : undefined,
        note: note.trim() || undefined,
      });
      setValue("");
    }

    setNote("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Status badge helper
  const getBpStatus = (sys?: number, dia?: number) => {
    if (!sys || !dia) return null;
    if (sys < 120 && dia < 80) return { label: "Normal (স্বাভাবিক)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (sys <= 129 && dia < 80) return { label: "Elevated (সামান্য বেশি)", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (sys >= 140 || dia >= 90) return { label: "High (উচ্চ রক্তচাপ)", color: "text-red-700 bg-red-50 border-red-200" };
    return { label: "Pre-hypertension", color: "text-amber-700 bg-amber-50 border-amber-200" };
  };

  const getSugarStatus = (val?: number, ctx?: string) => {
    if (!val) return null;
    if (ctx === "fasting") {
      if (val < 5.6) return { label: "Normal (স্বাভাবিক)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
      if (val <= 6.9) return { label: "Pre-diabetes", color: "text-amber-700 bg-amber-50 border-amber-200" };
      return { label: "High (ডায়াবেটিস মাত্রা)", color: "text-red-700 bg-red-50 border-red-200" };
    }
    if (val < 7.8) return { label: "Normal (স্বাভাবিক)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (val <= 11.0) return { label: "Elevated", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "High (উচ্চ)", color: "text-red-700 bg-red-50 border-red-200" };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Health Log & Vitals (স্বাস্থ্য লগ)"
      maxWidth="max-w-[560px]"
    >
      <div className="space-y-5 py-2">
        {/* Notice of AI Integration */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-brand-light/60 border border-brand/20 text-[13px] text-brand-dark">
          <Heart className="w-4 h-4 text-brand mt-0.5 shrink-0" />
          <p>
            আপনার স্বাস্থ্য রেকর্ড স্বয়ংক্রিয়ভাবে <strong>Dr MediLink AI</strong> চ্যাটে সিঙ্ক হবে, যাতে AI আপনার পূর্ববর্তী প্রেসার ও সুগারের ট্রেন্ড দেখে সঠিক পরামর্শ দিতে পারে।
          </p>
        </div>

        {/* Type Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(Object.keys(HEALTH_LOG_LABELS) as HealthLogType[]).map((type) => {
            const label = HEALTH_LOG_LABELS[type];
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-brand text-white shadow-xs"
                    : "bg-bg-soft text-text-muted hover:text-text-primary hover:bg-border-soft"
                }`}
              >
                {label.bn} ({label.en.split(" ")[0]})
              </button>
            );
          })}
        </div>

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-bg-soft border border-border-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-text-primary">
              নতুন এন্ট্রি যোগ করুন — {HEALTH_LOG_LABELS[selectedType].bn}
            </span>
            <span className="text-[12px] text-text-muted">
              একক: {HEALTH_LOG_LABELS[selectedType].unit}
            </span>
          </div>

          {selectedType === "bp" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1">
                  Systolic (উপরের)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-[14px] text-text-primary focus:border-brand focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1">
                  Diastolic (নিচের)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-[14px] text-text-primary focus:border-brand focus:outline-none"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-muted mb-1">
                  পরিমাপের মান ({HEALTH_LOG_LABELS[selectedType].unit})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={selectedType === "sugar" ? "e.g. 6.5" : "e.g. 98.6"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-[14px] text-text-primary focus:border-brand focus:outline-none"
                  required
                />
              </div>

              {selectedType === "sugar" && (
                <div>
                  <label className="block text-[12px] font-semibold text-text-muted mb-1">
                    সময়কাল / পরিমাপের প্রেক্ষাপট
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "fasting", label: "খালি পেটে (Fasting)" },
                      { key: "post_meal", label: "খাওয়ার ২ ঘণ্টা পর" },
                      { key: "random", label: "যেকোনো সময় (Random)" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setContext(opt.key as any)}
                        className={`py-1.5 px-2 rounded-md text-[12px] font-medium border text-center transition-colors ${
                          context === opt.key
                            ? "bg-white border-brand text-brand font-bold shadow-xs"
                            : "bg-white/50 border-border text-text-muted hover:border-brand-light"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-text-muted mb-1">
              মন্তব্য বা লক্ষণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="e.g. সকালে ওষুধ খাওয়ার পর / মাথা ভার ছিল"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-white text-[13px] text-text-primary focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> সংরক্ষিত হয়েছে!
              </span>
            ) : <span />}

            <Button size="s" variant="primary" type="submit" leftIcon={<Plus className="w-4 h-4" />}>
              সংরক্ষণ করুন
            </Button>
          </div>
        </form>

        {/* Recent Readings List & Trend */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand" /> সাম্প্রতিক রেকর্ড ({typeLogs.length})
            </h4>
          </div>

          {typeLogs.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-xl text-text-muted text-[13px]">
              এই ক্যাটাগরিতে এখনো কোনো রেকর্ড সংরক্ষণ করা হয়নি।
            </div>
          ) : (
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {typeLogs.map((log) => {
                const status =
                  log.type === "bp"
                    ? getBpStatus(log.systolic, log.diastolic)
                    : log.type === "sugar"
                    ? getSugarStatus(log.value, log.context)
                    : null;

                const dateStr = new Date(log.measuredAt).toLocaleString("bn-BD", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-border-soft hover:border-brand-light transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-heading font-extrabold text-text-primary">
                          {log.type === "bp"
                            ? `${log.systolic}/${log.diastolic} mmHg`
                            : `${log.value} ${HEALTH_LOG_LABELS[log.type].unit}`}
                        </span>

                        {status && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${status.color}`}
                          >
                            {status.label}
                          </span>
                        )}

                        {log.context && (
                          <span className="px-1.5 py-0.5 rounded bg-bg-soft text-[11px] text-text-muted">
                            {log.context === "fasting"
                              ? "খালি পেটে"
                              : log.context === "post_meal"
                              ? "খাওয়ার পর"
                              : "র‍্যান্ডম"}
                          </span>
                        )}
                      </div>

                      <div className="text-[12px] text-text-muted mt-0.5 flex items-center gap-2">
                        <span>{dateStr}</span>
                        {log.note && <span>• {log.note}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteLog(log.id)}
                      className="text-text-muted hover:text-emergency p-1.5 rounded-md hover:bg-emergency-soft transition-colors"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
