"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput, PendingAttachment } from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { HistoryDrawer } from "@/components/chat/HistoryDrawer";
import { LimitReachedCard } from "@/components/chat/LimitReachedCard";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { DeleteModal } from "@/components/chat/DeleteModal";
import { useChatStore } from "@/stores/useChatStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useAttachmentStore } from "@/stores/useAttachmentStore";
import { useSummaryStore } from "@/stores/useSummaryStore";
import { useMedicationStore } from "@/stores/useMedicationStore";
import { useHealthLogStore } from "@/stores/useHealthLogStore";
import { useMemoryStore } from "@/stores/useMemoryStore";
import { getActiveMemoryPrompts } from "@/lib/memory";
import { useToast } from "@/components/ui/Toast";
import { exportChatToPDF } from "@/lib/pdf-generator";
import { SummarizeModal } from "@/components/chat/SummarizeModal";
import { HealthLogModal } from "@/components/health-log/HealthLogModal";
import doctorsData from "@/data/doctors.json";
import type { Doctor } from "@/types";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import {
  AttachmentError,
  createAttachmentId,
  inferAttachmentKind,
  normaliseImage,
  putBlob,
} from "@/lib/attachments";
import { renderDocumentForPrompt } from "@/lib/consult-summary";
import type { Attachment } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Doctor handover (v3)
  const summaries = useSummaryStore((s) => s.summaries);
  const addSummary = useSummaryStore((s) => s.addSummary);
  const updateSummary = useSummaryStore((s) => s.updateSummary);
  const medicationSchedules = useMedicationStore((s) => s.schedules);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isHealthLogOpen, setIsHealthLogOpen] = useState(false);
  const [activeSummaryId, setActiveSummaryId] = useState<string | null>(null);
  // Provenance of the active summary, straight from the server.
  const [summarySource, setSummarySource] = useState<"model" | "fallback">("model");
  const [summaryVerified, setSummaryVerified] = useState(false);
  
  // Stores
  const profile = useProfileStore(s => s.profile);
  const { 
    sessions, activeSessionId, selectedModel, dailyUsage,
    setSelectedModel, setActiveSessionId, createNewSession, 
    addMessage, updateLastAssistantMessage, deleteSession, incrementDailyUsage, getRemainingChatsToday
  } = useChatStore();
  const isPremium = useSubscriptionStore(s => s.isPremium());

  // Attachments (v3)
  const attachments = useAttachmentStore((s) => s.attachments);
  const addAttachment = useAttachmentStore((s) => s.addAttachment);
  const updateAttachment = useAttachmentStore((s) => s.updateAttachment);
  const removeAttachment = useAttachmentStore((s) => s.removeAttachment);

  // State
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    model: string;
    language: string;
    task: string;
  } | null>(null);

  // Pending attachment + scan state
  const [pendingAttachmentId, setPendingAttachmentId] = useState<string | null>(null);
  const [scanningIds, setScanningIds] = useState<string[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
  // Data URLs stay out of the persisted store — only the blob is stored.
  const imageDataUrlsRef = useRef<Record<string, string>>({});

  // Derived
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const remainingChats = getRemainingChatsToday(isPremium);
  const canChat = remainingChats > 0;

  const pendingAttachment: PendingAttachment | null = (() => {
    if (!pendingAttachmentId) return null;
    const found = attachments.find((a) => a.id === pendingAttachmentId);
    if (!found) return null;
    return {
      id: found.id,
      url: found.url,
      kind: found.kind,
      fileName: found.fileName,
      isScanning: scanningIds.includes(found.id),
      errorMessage: attachmentErrors[found.id] ?? null,
    };
  })();

  // Auto-create session if none active on mount.
  //
  // zustand's persist rehydrates asynchronously, so on the first render
  // `activeSessionId` is still null even when a session was saved. Creating
  // a session right there would orphan the real conversation and leave an
  // empty session active after every reload. Wait for hydration first.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useChatStore.persist.onFinishHydration(() =>
      setIsHydrated(true),
    );
    if (useChatStore.persist.hasHydrated()) setIsHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isHydrated && !activeSessionId) {
      createNewSession();
    }
  }, [isHydrated, activeSessionId, createNewSession]);

  // Restore the object URLs for stored attachments — a blob: URL from a
  // previous session is dead after a reload.
  useEffect(() => {
    void useAttachmentStore.getState().hydrate();
  }, []);

  // Abort controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  /* ──────────────────────────────────────────────────────────────
     v3 — attachment scanning
     ────────────────────────────────────────────────────────────── */

  const runScan = useCallback(
    async (attachmentId: string, dataUrl: string) => {
      setScanningIds((prev) => [...prev, attachmentId]);
      setAttachmentErrors((prev) => {
        const next = { ...prev };
        delete next[attachmentId];
        return next;
      });

      try {
        const response = await fetch("/api/vision/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl, task: "auto", attachmentId }),
        });

        const payload = await response.json();

        if (payload?.ok) {
          updateAttachment(attachmentId, {
            kind: payload.task ?? "photo",
            document: payload.document ?? null,
            ocrConfidence:
              typeof payload.confidence === "number" ? payload.confidence : null,
            rawText: payload.rawText ?? "",
            warnings: payload.warnings ?? [],
            model: payload.model,
          });
        } else {
          setAttachmentErrors((prev) => ({
            ...prev,
            [attachmentId]:
              payload?.message ??
              "We could not read this image clearly. Please enter the details manually.",
          }));
        }
      } catch {
        setAttachmentErrors((prev) => ({
          ...prev,
          [attachmentId]:
            "We could not read this image clearly. Please check your connection or enter the details manually.",
        }));
      } finally {
        setScanningIds((prev) => prev.filter((id) => id !== attachmentId));
      }
    },
    [updateAttachment],
  );

  const handleAttach = useCallback(
    async (file: File) => {
      try {
        const normalised = await normaliseImage(file);
        const id = createAttachmentId();

        // Persist the binary in IndexedDB; keep only metadata in the store.
        await putBlob(id, normalised.blob);

        const record: Attachment = {
          id,
          url: URL.createObjectURL(normalised.blob),
          type: normalised.mimeType,
          timestamp: Date.now(),
          kind: inferAttachmentKind(file.name),
          source: "ocr",
          fileName: file.name,
          sizeBytes: normalised.sizeBytes,
          verified: false,
          document: null,
          warnings: [],
        };

        addAttachment(record);
        setPendingAttachmentId(id);
        imageDataUrlsRef.current[id] = normalised.dataUrl;

        // The scan runs in parallel — the user is never blocked.
        void runScan(id, normalised.dataUrl);
      } catch (error) {
        const message =
          error instanceof AttachmentError
            ? error.message
            : "We could not process that image. Please try another photo.";
        showToast(message, "error");
      }
    },
    [addAttachment, runScan, showToast],
  );

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      removeAttachment(id);
      delete imageDataUrlsRef.current[id];
      setAttachmentErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingAttachmentId((current) => (current === id ? null : current));
    },
    [removeAttachment],
  );

  const handleConfirmAttachment = useCallback(
    (id: string) => {
      updateAttachment(id, { verified: true });
      showToast("Document confirmed.", "success");
    },
    [updateAttachment, showToast],
  );

  const handleRetryAttachment = useCallback(
    (id: string) => {
      const dataUrl = imageDataUrlsRef.current[id];
      if (!dataUrl) {
        showToast("Please upload the document again to retry.", "info");
        return;
      }
      void runScan(id, dataUrl);
    },
    [runScan, showToast],
  );

  /* ──────────────────────────────────────────────────────────────
     v3 — "Summarize for Doctor"
     ────────────────────────────────────────────────────────────── */

  const handleSummarize = useCallback(async () => {
    const session = useChatStore.getState().sessions.find((s) => s.id === activeSessionId);
    const conversation = session?.messages ?? [];
    const userTurns = conversation.filter((m) => m.role === "user").length;

    if (userTurns < 2) {
      showToast("Chat a little more so there is something to summarise.", "info");
      return;
    }

    setIsSummaryOpen(true);
    setIsSummaryGenerating(true);
    setSummaryError(null);

    // Only confirmed documents are shared with the summariser (S-2).
    const documents = useAttachmentStore
      .getState()
      .getConfirmed()
      .map((attachment) => ({
        kind: attachment.kind,
        verified: attachment.verified,
        text:
          attachment.rawText ||
          (attachment.document
            ? JSON.stringify(attachment.document)
            : ""),
      }))
      .filter((doc) => doc.text.trim());

    try {
      const response = await fetch("/api/consult/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          messages: conversation.map((m) => ({ role: m.role, content: m.content })),
          profile,
          documents,
        }),
      });

      const payload = await response.json();

      if (!payload?.ok || !payload?.summary) {
        setSummaryError(payload?.message ?? "We could not prepare a summary right now.");
        return;
      }

      addSummary(payload.summary);
      setActiveSummaryId(payload.summary.id);
      // The server tells us whether the summary was machine-generated or
      // fell back to the deterministic builder. The "please verify this"
      // notice must be driven by THAT, never by the model's own confidence
      // score — a model claiming 0.95 confidence must not be able to hide
      // the machine-output warning.
      setSummarySource(payload.source ?? "model");
      setSummaryVerified(payload.verified === true);
    } catch {
      setSummaryError("We could not prepare a summary right now.");
    } finally {
      setIsSummaryGenerating(false);
    }
  }, [activeSessionId, profile, addSummary, showToast]);

  const activeSummary = activeSummaryId
    ? summaries.find((s) => s.id === activeSummaryId) ?? null
    : null;

  const matchingDoctors = useMemo(() => {
    if (!activeSummary) return [];
    const all = doctorsData as Doctor[];
    const specialty = activeSummary.suggestedSpecialty;
    const matches = all.filter((d) => d.specialty === specialty);
    return matches.length ? matches : all.filter((d) => d.specialty === "General Physician");
  }, [activeSummary]);

  const handleBookWithSummary = useCallback(
    (doctor: Doctor, message: string) => {
      const url = createWhatsAppUrl(message, doctor.whatsappNumber);
      window.open(url, "_blank", "noopener,noreferrer");
      setIsSummaryOpen(false);
    },
    [],
  );

  const handleSend = async (text: string) => {
    const hasAttachment = Boolean(pendingAttachmentId);
    if ((!text.trim() && !hasAttachment) || isStreaming || !canChat) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
    }

    const attachmentIds = pendingAttachmentId ? [pendingAttachmentId] : undefined;

    // Add user message
    addMessage(sessionId, {
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
      attachmentIds,
    });
    setInputValue("");
    setIsStreaming(true);

    // Auto-extract durable facts from the user's message (deterministic, no API call).
    useMemoryStore.getState().processUserMessage(text.trim());

    // A confirmed document is added to the model's context as data.
    const pendingRecord = pendingAttachmentId
      ? attachments.find((a) => a.id === pendingAttachmentId)
      : undefined;
    const documentBlock =
      pendingRecord?.verified && pendingRecord.document
        ? renderDocumentForPrompt({
            kind: pendingRecord.kind,
            document: pendingRecord.document,
            verified: pendingRecord.verified,
          })
        : "";

    const messageForApi = documentBlock ? `${text.trim()}\n\n${documentBlock}` : text.trim();

    // Initial empty assistant message
    addMessage(sessionId, {
      role: "assistant",
      content: "",
      timestamp: Date.now()
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // The composer is free again immediately.
    setPendingAttachmentId(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: messageForApi }],
          model: selectedModel,
          profile: profile,
          healthLogsSummary: useHealthLogStore.getState().formatSummaryForPrompt(5),
          memoryPrompts: getActiveMemoryPrompts(),
          memories: useMemoryStore.getState().memories,
        })
      });

      if (!response.ok) {
        let friendly =
          "দুঃখিত, সংযোগে সাময়িক সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।";
        try {
          const data = await response.json();
          if (data?.error && typeof data.error === "string") friendly = data.error;
        } catch {
          /* keep the default friendly message */
        }
        throw new Error(friendly);
      }

      // The router reports which model/language/task it chose. Surfacing it in
      // the header makes the dynamic routing visible (and demo-friendly).
      const modelLabel = response.headers.get("X-MediLink-Model-Label");
      const language = response.headers.get("X-MediLink-Language");
      const task = response.headers.get("X-MediLink-Task");
      if (modelLabel) {
        setRouteInfo({
          model: modelLabel,
          language: language || "",
          task: task || "",
        });
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullContent += decoder.decode(value, { stream: true });
        updateLastAssistantMessage(sessionId, fullContent);
      }
      
      incrementDailyUsage();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.log("Stream stopped by user");
        return;
      }
      console.error("Chat error:", error);
      const friendly =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "দুঃখিত, সংযোগে সাময়িক সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।";

      // Never wipe a partially streamed answer — append a short notice instead.
      const session = useChatStore
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const lastMsg = session?.messages[session.messages.length - 1];

      if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.trim().length > 0) {
        updateLastAssistantMessage(
          sessionId,
          `${lastMsg.content}\n\n_(সংযোগ মাঝপথে বিচ্ছিন্ন হয়েছে — আবার পাঠালে পুরো উত্তর পাবেন।)_`
        );
      } else {
        updateLastAssistantMessage(sessionId, friendly);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleDownloadPDF = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session && isPremium) {
      // The printed report carries the same handover summary the patient
      // can send to a doctor, plus the dose reminders they set.
      const sessionSummary =
        summaries.find((summary) => summary.sessionId === id) ??
        summaries.find((summary) => summary.sessionId === activeSessionId) ??
        null;

      exportChatToPDF(session, profile, sessionSummary, medicationSchedules);
      showToast("Print dialog opened — choose \"Save as PDF\" to download.", "success");
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--content-offset))] overflow-hidden">
      {/* Mobile History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onDeleteSession={(id) => setDeleteModalId(id)}
        onDownloadSession={handleDownloadPDF}
        isPremium={isPremium}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={() => {
          if (deleteModalId) {
            deleteSession(deleteModalId);
            showToast("Conversation deleted.", "info");
          }
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-bg-main relative">
        <ChatHeader
          modelValue={selectedModel}
          onModelChange={setSelectedModel}
          onNewChat={() => createNewSession()}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenMobileMenu={() => setIsHistoryOpen(true)}
          routeInfo={routeInfo}
          onSummarize={handleSummarize}
          canSummarize={messages.filter((m) => m.role === "user").length >= 2}
          onOpenHealthLog={() => setIsHealthLogOpen(true)}
        />
        
        <ChatMessages
          messages={messages}
          isStreaming={isStreaming}
          attachmentErrors={attachmentErrors}
          onConfirmAttachment={handleConfirmAttachment}
          onRetryAttachment={handleRetryAttachment}
          onRemoveAttachment={handleRemoveAttachment}
        />

        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 mt-32 px-4">
            <div className="pointer-events-auto w-full">
              <SuggestedPrompts profile={profile} onSelect={handleSend} />
            </div>
          </div>
        )}

        {canChat ? (
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => handleSend(inputValue)}
            onStop={handleStop}
            isLoading={isStreaming}
            pendingAttachment={pendingAttachment}
            onAttach={handleAttach}
            onRemoveAttachment={() =>
              pendingAttachmentId && handleRemoveAttachment(pendingAttachmentId)
            }
          />
        ) : (
          <LimitReachedCard />
        )}
      </div>

      <ChatSidebar
        usageCount={dailyUsage.count}
        maxUsage={2}
      />

      {/* Health Log & Vitals */}
      <HealthLogModal
        isOpen={isHealthLogOpen}
        onClose={() => setIsHealthLogOpen(false)}
      />

      {/* Doctor handover summary */}
      <SummarizeModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        summary={activeSummary}
        summarySource={summarySource}
        summaryVerified={summaryVerified}
        isGenerating={isSummaryGenerating}
        errorMessage={summaryError}
        doctors={matchingDoctors}
        profile={profile || {}}
        isPremium={isPremium}
        onUpdate={(patch) => {
          if (activeSummaryId) updateSummary(activeSummaryId, patch);
        }}
        onBook={handleBookWithSummary}
        onBrowseDoctors={() => {
          setIsSummaryOpen(false);
          router.push("/doctors");
        }}
      />
    </div>
  );
}
