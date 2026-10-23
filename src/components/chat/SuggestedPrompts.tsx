import React from "react";
import { Sparkles } from "lucide-react";
import { Profile } from "@/types";

interface SuggestedPromptsProps {
  profile: Profile | null;
  onSelect: (prompt: string) => void;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ profile, onSelect }) => {
  // Generate context-aware prompts based on diseases
  const getPrompts = () => {
    const basePrompts = [
      "Jor 2 din dhore, matha betha. Ki khabo?",
      "বুকে জ্বালাপোড়া আর টক ঢেঁকুর কেন হচ্ছে?",
      "My child has a dry cough at night — what can I do?",
    ];

    if (!profile) return basePrompts;

    const customPrompts: string[] = [];
    const diseases = Array.isArray(profile.diseases) ? profile.diseases : [];
    if (diseases.includes("Diabetes")) {
      customPrompts.push("What should I eat to manage my blood sugar today?");
    }
    if (diseases.includes("Asthma")) {
      customPrompts.push("My asthma is acting up due to the dust. What should I do?");
    }
    if (diseases.includes("High Blood Pressure")) {
      customPrompts.push("Are there specific foods I should avoid for high blood pressure?");
    }

    // Mix custom with base, taking up to 3 total
    const combined = [...customPrompts, ...basePrompts].slice(0, 3);
    return combined;
  };

  const prompts = getPrompts();

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-[800px] mx-auto">
      {prompts.map((prompt, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(prompt)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-soft rounded-full text-[14px] md:text-[14.5px] font-medium text-brand hover:border-brand-soft hover:bg-brand-light transition-colors text-left shadow-xs"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[240px] sm:max-w-none">{prompt}</span>
        </button>
      ))}
    </div>
  );
};
