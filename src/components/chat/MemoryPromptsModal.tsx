"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit, GripVertical, Brain } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { MemoryPrompt } from "@/types";
import { createMemoryPromptId } from "@/types";

interface MemoryPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROMPTS_STORAGE_KEY = "medilink_memory_prompts";

function getPrompts(): MemoryPrompt[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePrompts(prompts: MemoryPrompt[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
    window.dispatchEvent(new CustomEvent("memory-prompts-updated"));
  }
}

export const MemoryPromptsModal: React.FC<MemoryPromptsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompts, setPrompts] = useState<MemoryPrompt[]>([]);
  const [newPromptText, setNewPromptText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { showToast } = useToast();

  const loadPrompts = useCallback(() => {
    setPrompts(getPrompts());
  }, []);

  useEffect(() => {
    loadPrompts();
    window.addEventListener("memory-prompts-updated", loadPrompts);
    return () => window.removeEventListener("memory-prompts-updated", loadPrompts);
  }, [loadPrompts]);

  const handleAdd = () => {
    if (!newPromptText.trim()) return;

    const current = getPrompts();
    const newPrompt: MemoryPrompt = {
      id: createMemoryPromptId(),
      text: newPromptText.trim().slice(0, 500),
      isActive: true,
      priority: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    current.push(newPrompt);
    current.sort((a, b) => b.priority - a.priority);
    savePrompts(current);
    setNewPromptText("");
    showToast("Memory prompt added", "success");
  };

  const handleToggle = (prompt: MemoryPrompt) => {
    const current = getPrompts();
    const index = current.findIndex((p) => p.id === prompt.id);
    if (index === -1) return;

    current[index] = {
      ...current[index],
      isActive: !current[index].isActive,
      updatedAt: Date.now(),
    };
    savePrompts(current);
    showToast(current[index].isActive ? "Prompt enabled" : "Prompt disabled", "info");
  };

  const handleDelete = (id: string) => {
    const current = getPrompts();
    const filtered = current.filter((p) => p.id !== id);
    savePrompts(filtered);
    showToast("Memory prompt deleted", "success");
  };

  const handleEditSave = (id: string) => {
    if (!editText.trim()) return;

    const current = getPrompts();
    const index = current.findIndex((p) => p.id === id);
    if (index === -1) return;

    current[index] = {
      ...current[index],
      text: editText.trim().slice(0, 500),
      updatedAt: Date.now(),
    };
    current.sort((a, b) => b.priority - a.priority);
    savePrompts(current);
    setEditingId(null);
    setEditText("");
    showToast("Memory prompt updated", "success");
  };

  const activePrompts = prompts.filter((p) => p.isActive);
  const inactivePrompts = prompts.filter((p) => !p.isActive);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Memory Prompts"
      maxWidth="max-w-[640px]"
    >
      <div className="space-y-6">
        {/* Add new prompt */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPromptText}
            onChange={(e) => setNewPromptText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g., Always reply in Banglish, Use generic medicine names, Remind me to take meds with food"
            className="flex-1 px-4 py-3 border border-border-soft rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            maxLength={500}
          />
          <Button onClick={handleAdd} disabled={!newPromptText.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Active prompts */}
        {activePrompts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full"></span>
              Active ({activePrompts.length})
            </h4>
            {activePrompts.map((prompt) => (
              <PromptItem
                key={prompt.id}
                prompt={prompt}
                onToggle={() => handleToggle(prompt)}
                onEdit={() => {
                  setEditingId(prompt.id);
                  setEditText(prompt.text);
                }}
                onDelete={() => handleDelete(prompt.id)}
                isEditing={editingId === prompt.id}
                editText={editText}
                setEditText={setEditText}
                onSave={() => handleEditSave(prompt.id)}
                onCancel={() => {
                  setEditingId(null);
                  setEditText("");
                }}
              />
            ))}
          </div>
        )}

        {/* Inactive prompts */}
        {inactivePrompts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text-muted flex items-center gap-2">
              <span className="w-2 h-2 bg-text-muted rounded-full"></span>
              Inactive ({inactivePrompts.length})
            </h4>
            {inactivePrompts.map((prompt) => (
              <PromptItem
                key={prompt.id}
                prompt={prompt}
                onToggle={() => handleToggle(prompt)}
                onEdit={() => {
                  setEditingId(prompt.id);
                  setEditText(prompt.text);
                }}
                onDelete={() => handleDelete(prompt.id)}
                isEditing={editingId === prompt.id}
                editText={editText}
                setEditText={setEditText}
                onSave={() => handleEditSave(prompt.id)}
                onCancel={() => {
                  setEditingId(null);
                  setEditText("");
                }}
              />
            ))}
          </div>
        )}

        {prompts.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p className="mb-2">No memory prompts yet.</p>
            <p className="text-sm">Add instructions you want Dr MediLink to always follow.</p>
          </div>
        )}

        <div className="pt-4 border-t border-border-soft text-sm text-text-muted">
          <p><strong>Examples:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>&quot;Always reply in Banglish (Bangla written in English letters)&quot;</li>
            <li>&quot;Use generic medicine names instead of brand names&quot;</li>
            <li>&quot;Remind me to take medications with food&quot;</li>
            <li>&quot;I prefer brief, concise answers&quot;</li>
            <li>&quot;Alert me if any suggestion conflicts with my penicillin allergy&quot;</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

interface PromptItemProps {
  prompt: MemoryPrompt;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editText: string;
  setEditText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const PromptItem: React.FC<PromptItemProps> = ({
  prompt,
  onToggle,
  onEdit,
  onDelete,
  isEditing,
  editText,
  setEditText,
  onSave,
  onCancel,
}) => {
  if (isEditing) {
    return (
      <div className="flex gap-2 p-3 bg-bg-soft rounded-lg">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          className="flex-1 px-3 py-2 border border-brand rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          autoFocus
          maxLength={500}
        />
        <button onClick={onSave} className="px-3 py-2 text-brand hover:bg-brand-light rounded text-sm font-medium">
          Save
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-text-muted hover:bg-bg-main rounded text-sm">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-border-soft rounded-lg">
      <GripVertical className="w-5 h-5 text-text-muted cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{prompt.text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 text-xs rounded-full bg-brand-light text-brand">
            Priority: {prompt.priority}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-bg-soft text-text-muted">
            {new Date(prompt.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="w-10 h-6 relative rounded-full border-2 transition-colors"
          style={{
            backgroundColor: prompt.isActive ? "#10B981" : "#E5E7EB",
            borderColor: prompt.isActive ? "#10B981" : "#D1D5DB",
          }}
          aria-label={prompt.isActive ? "Disable prompt" : "Enable prompt"}
        >
          <span
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{
              transform: prompt.isActive ? "translateX(24px)" : "translateX(2px)",
            }}
          />
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-bg-soft hover:text-text-primary transition-colors"
          aria-label="Edit prompt"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Delete prompt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};