import React from "react";
import { FileClock, Plus, Menu, Stethoscope, Activity, Brain } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { MemoryPromptsModal } from "./MemoryPromptsModal";

interface ChatHeaderProps {
  modelValue: "med1-flash" | "med1-pro";
  onModelChange: (val: "med1-flash" | "med1-pro") => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenMobileMenu?: () => void;
  routeInfo?: { model: string; language: string; task: string } | null;
  /** Turns the conversation into a doctor handover summary. */
  onSummarize?: () => void;
  /** Disabled when the conversation is too short to summarise. */
  canSummarize?: boolean;
  onOpenHealthLog?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  modelValue,
  onModelChange,
  onNewChat,
  onOpenHistory,
  onOpenMobileMenu,
  routeInfo,
  onSummarize,
  canSummarize,
  onOpenHealthLog,
}) => {
  // localStorage is unavailable during SSR, so the server renders the free
  // state. Gate on mount to keep hydration consistent, then reveal Premium.
  const [mounted, setMounted] = React.useState(false);
  const [isMemoryPromptsOpen, setIsMemoryPromptsOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isPremium = useSubscriptionStore(s => s.isPremium());
  const premiumActive = mounted && isPremium;

  return (
    <>
      <div className="h-16 border-b border-border-soft bg-white px-4 flex items-center justify-between shrink-0 sticky top-0 z-10">
      
      {/* Left: Mobile Menu + Doctor Info */}
      <div className="flex items-center gap-3">
        <button 
          className="lg:hidden w-10 h-10 flex items-center justify-center text-text-primary -ml-2 rounded-md hover:bg-bg-soft"
          onClick={onOpenMobileMenu}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold">
              Dr
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white"></div>
          </div>
          <div>
            <div className="text-[15.5px] font-bold text-text-primary leading-tight">Dr MediLink</div>
            <div
              className="text-[13px] text-text-muted font-medium"
              title={
                routeInfo
                  ? `Routed to ${routeInfo.model} · ${routeInfo.language} · ${routeInfo.task}`
                  : undefined
              }
            >
              AI Assistant
              {routeInfo && (
                <span className="hidden md:inline text-text-muted/80">
                  {" "}· {routeInfo.language} · {routeInfo.model}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <SegmentedControl
            value={modelValue}
            onChange={(val) => onModelChange(val as "med1-flash" | "med1-pro")}
            options={[
              { label: "Flash", value: "med1-flash" },
              { label: "Pro", value: "med1-pro", disabled: !premiumActive }
            ]}
          />
        </div>
        
        {/* Memory Prompts Button */}
        <button
          onClick={() => setIsMemoryPromptsOpen(true)}
          title="Memory Prompts — persistent instructions for Dr MediLink"
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-bg-soft hover:text-text-primary transition-colors"
          aria-label="Memory Prompts"
        >
          <Brain className="w-5 h-5" />
        </button>

        {onSummarize && (
          <button
            onClick={onSummarize}
            disabled={!canSummarize}
            title={
              canSummarize
                ? "Summarize this chat for a doctor"
                : "Chat a little more so there is something to summarise"
            }
            className="h-9 px-3 flex items-center gap-1.5 rounded-full border-[1.5px] border-brand text-brand hover:bg-brand-light disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            aria-label="Summarize for doctor"
          >
            <Stethoscope className="w-4 h-4" />
            <span className="hidden md:inline text-[14px] font-bold">Summarize</span>
          </button>
        )}

        {onOpenHealthLog && (
          <button
            onClick={onOpenHealthLog}
            title="স্বাস্থ্য লগ / Vitals (BP, Sugar, Temp)"
            className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-border-soft text-text-primary hover:border-brand-light hover:bg-bg-soft transition-colors"
            aria-label="Health Log"
          >
            <Activity className="w-4 h-4 text-brand" />
            <span className="hidden sm:inline text-[14px] font-semibold">স্বাস্থ্য লগ</span>
          </button>
        )}

        <button
          onClick={onOpenHistory}
          className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-bg-soft hover:text-text-primary transition-colors"
          aria-label="Chat history"
        >
          <FileClock className="w-5 h-5" />
        </button>

        <button 
          onClick={onNewChat}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm"
          aria-label="New chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>

      <MemoryPromptsModal
        isOpen={isMemoryPromptsOpen}
        onClose={() => setIsMemoryPromptsOpen(false)}
      />
    </>
  );
};
