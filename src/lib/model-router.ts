/**
 * MediLink AI — context-aware model router.
 *
 * The platform runs exclusively on OpenRouter free models. Free-tier health
 * varies in waves, so the router never ships a single hard-coded model:
 * it builds an ordered, mode-aware candidate list from three signals:
 *
 *   1. LANGUAGE   — Bangla script, Banglish (romanised Bangla) or English.
 *   2. MODE       — Flash (latency-first) vs Pro (quality-first).
 *   3. TASK TYPE  — emergency / serious / mental-health / minor / general,
 *                   plus a complexity score (symptoms, length, question count).
 *
 * Model facts come from live probes (Oct 2026), not assumptions:
 *   • MiniMax M3.1 Flash  — light, fast, strong Bangla + English, 1M context.
 *   • Nemotron 3.5 Super VL — 120B MoE, best Bangla safety/persona discipline,
 *     but spends reasoning tokens before visible content (needs a generous cap).
 *   • Nemotron 3 Ultra 550B — frontier reasoning, very fast TTFT, excellent
 *     English; occasionally mixes scripts in long Bangla answers, so the API's
 *     sanity gate watches it closely.
 *
 * Gemma 4 free endpoints were upstream 429 during testing, and Inkling free
 * endpoints are restricted to agent harnesses — both are intentionally excluded.
 */

export type ChatMode = "med1-flash" | "med1-pro";
export type DetectedLanguage = "bn" | "banglish" | "en";
export type TaskType = "emergency" | "serious" | "mental-health" | "minor" | "general";
export type Complexity = "simple" | "moderate" | "complex";

type ModelKey = "minimax" | "supervl" | "ultra";

interface ModelDefinition {
  id: string;
  label: string;
  shortLabel: string;
  tier: "flash" | "heavy";
}

const MODEL_DEFS: Record<ModelKey, ModelDefinition> = {
  minimax: {
    id: "minimax/minimax-m3.1-flash:free",
    label: "MiniMax M3.1 Flash",
    shortLabel: "MiniMax Flash",
    tier: "flash",
  },
  supervl: {
    id: "nvidia/nemotron-3.5-super-vl:free",
    label: "Nemotron 3.5 Super VL",
    shortLabel: "Nemotron Super VL",
    tier: "heavy",
  },
  ultra: {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra 550B",
    shortLabel: "Nemotron Ultra",
    tier: "heavy",
  },
};

/* Patience for the first visible content chunk. Healthy observations:
 * MiniMax 1.4–4.5s, Ultra 1.2–5.5s, Super VL 2.8–6.8s. Budgets leave room
 * for congestion without letting a dead endpoint stall the whole demo. */
const FLASH_TTFT_MS: Record<ModelKey, number> = {
  minimax: 10_000,
  ultra: 12_000,
  supervl: 24_000,
};

const PRO_TTFT_MS: Record<ModelKey, number> = {
  minimax: 15_000,
  ultra: 20_000,
  supervl: 25_000,
};

/* max_tokens is only a ceiling — the prompt controls visible length. Heavy
 * reasoning models need a large ceiling because hidden reasoning is billed
 * against the same budget (Super VL can burn 3k+ tokens before replying). */
const FLASH_MAX_TOKENS: Record<ModelKey, number> = {
  minimax: 3_000,
  ultra: 4_000,
  supervl: 5_000,
};

const PRO_MAX_TOKENS: Record<ModelKey, number> = {
  minimax: 6_000,
  ultra: 10_000,
  supervl: 10_000,
};

export interface ModelCandidate {
  id: string;
  key: ModelKey;
  label: string;
  shortLabel: string;
  tier: "flash" | "heavy";
  ttftBudgetMs: number;
  maxTokens: number;
  temperature: number;
  reasoningEffort: "low" | "medium";
}

export interface RoutePlan {
  mode: ChatMode;
  language: DetectedLanguage;
  taskType: TaskType;
  complexity: Complexity;
  languageHint: string;
  candidates: ModelCandidate[];
}

/* ────────────────────────────────────────────────────────────────────
   1. Language detection
   ──────────────────────────────────────────────────────────────────── */

const BENGALI_SCRIPT_RE = /[\u0980-\u09FF]/;

/**
 * Assamese-only characters.
 *
 * U+09F0 and U+09F1 sit INSIDE the Bengali block but are used only in
 * Assamese. Including them in the Bangla range made Assamese text classify
 * as Bangla — and the chat route then rejects any reply containing them as
 * "corrupt", which produced a permanent 503 for Assamese speakers.
 */
const ASSAMESE_ONLY_RE = /[\u09F0\u09F1]/;

/**
 * Distinctive romanised-Bangla words.
 *
 * Split into two tiers. STRONG markers are unmistakably Bangla and are
 * enough on their own. AMBIGUOUS markers can collide with an English word
 * ("mon" in "Mon has a fever") so two of them are required before a
 * message is called Banglish — otherwise a short English sentence flips the
 * reply language.
 */
const BANGLISH_STRONG_MARKERS = [
  "amar", "amr", "amake", "amader", "apnar", "apner", "apni", "apnader",
  "ami", "tumi", "tomar", "tader", "kemon", "kemne", "korbo", "korchi",
  "korben", "korte", "khabo", "khacchi", "khete", "betha", "byatha",
  "buke", "buker", "shash", "shwas", "osud", "oshud", "daktar", "hocche",
  "hoche", "lagbe", "lagche", "dhore", "chilo", "chhilo", "ekhon",
  "bodhoy", "bhalo", "valo", "kharap", "matha", "jor", "jore",
  "sordi", "bomich", "bolun", "bolo", "jani", "keno", "kivabe", "kothay",
  "hobe", "pari", "nijeke", "thanda", "ghumi", "jhor", "paithe", "niye",
  "ni", "khabar", "rashoi", "mach", "pakha", "khana", "shomoy",
];

const BANGLISH_AMBIGUOUS_MARKERS = [
  "mone", "mon", "ghor", "raat", "thik", "nei", "nai", "kashi", "gola",
  "bomi", "khub", "mathay",
];

const BANGLISH_STRONG_RE = new RegExp(
  "\\b(" + BANGLISH_STRONG_MARKERS.join("|") + ")\\b",
  "gi"
);
const BANGLISH_AMBIGUOUS_RE = new RegExp(
  "\\b(" + BANGLISH_AMBIGUOUS_MARKERS.join("|") + ")\\b",
  "gi"
);

export function detectLanguage(text: string): DetectedLanguage {
  // Assamese is not Bangla — do not classify it as such.
  if (ASSAMESE_ONLY_RE.test(text)) return "en";
  if (BENGALI_SCRIPT_RE.test(text)) return "bn";

  const strong = new Set(
    (text.match(BANGLISH_STRONG_RE) || []).map((m) => m.toLowerCase())
  );
  const ambiguous = new Set(
    (text.match(BANGLISH_AMBIGUOUS_RE) || []).map((m) => m.toLowerCase())
  );

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // A single STRONG marker is enough in a short question ("amar jor").
  if (strong.size >= 1) return "banglish";
  // Ambiguous markers need two, so "Mon I have a sore throat" stays English.
  if (ambiguous.size >= 2) return "banglish";
  // Two or more markers of any kind is enough regardless of length.
  if (strong.size + ambiguous.size >= 2) return "banglish";
  // A single ambiguous marker in a very short message is weak evidence.
  if (ambiguous.size === 1 && wordCount <= 4) return "banglish";
  return "en";
}

/* ────────────────────────────────────────────────────────────────────
   2. Task-type detection (safety-first order)
   ──────────────────────────────────────────────────────────────────── */

/**
 * Emergency phrases — the single source of truth for "this is an emergency".
 *
 * Exported so the doctor-handover summary (src/lib/consult-summary.ts) can
 * reuse the SAME list instead of keeping a second, shorter copy. A patient
 * who writes "shash nite kosto hocche" or who mentions suicidal thoughts is
 * escalated to 999 in the chat; the handover must surface the same phrases
 * or the doctor never learns it happened.
 */
export const EMERGENCY_PATTERNS: RegExp[] = [
  // Chest pain — "my chest hurts" is how patients actually say it.
  /(chest|buke|buker|chest)[^\n]{0,12}?(pain|pains|betha|byatha|chap|bath|hurts?|aching|tight|pressure)/i,
  /বুকে\s*(ব্যথা|বাথ|চাপ|ভার)/,
  /(heart attack|হার্ট অ্যাটাক)/i,
  // Breathing difficulty — includes "can't breathe properly" and "gasping".
  /(shortness of breath|breathing (difficulty|problem|trouble)|cannot breathe|can't breathe|struggling to breathe|gasping|choking|shash nite (kosto|koshto)|shwas nite (kosto|koshto))/i,
  /শ্বাস\s*(নিতে|নেওয়া)/,
  /শ্বাসকষ্ট/,
  /(stroke|স্ট্রোক|paralysis|প্যারালাইসিস|one side.*(weak|numb)|মুখ বেঁকে|অবশ)/i,
  // Bleeding — "severe bleeding" / "I'm bleeding" were not matched before.
  /(heavy bleeding|severe bleeding|bleeding heavily|bleeding.*(stop|won't|heavy|badly|a lot)|i'?m bleeding|am bleeding|রক্তক্ষরণ|অতিরিক্ত রক্ত|রক্ত বন্ধ)/i,
  // Loss of consciousness / fits.
  /(unconscious|passed out|passed away|fainted|fainting|blacked? out|collapsed|collapse|অচেতন|অচেতন হয়ে)/i,
  /(seizure|seizures|convulsion|convulsions|epileptic fit|\bfits?\b|spasm|খিঁচুনি|খিঁচুনির)/i,
  /(suicid|আত্মহত্যা|নিজেকে মেরে|মরে যেতে|বাঁচতে চাই না|জীবন শেষ)/i,
  /(anaphylaxis|severe allergic|throat swelling|গলা ফুলে|ঠোঁট ফুলে)/i,
];

const SERIOUS_PATTERNS: RegExp[] = [
  /(cancer|ক্যান্সার|tumou?r|টিউমার|leukemia|লিউকেমিয়া|lymphoma|লিম্ফোমা)/i,
  /(chemotherapy|কেমোথেরাপি|radiotherapy|রেডিওথেরাপি|oncology|অনকোলজি)/i,
  /(organ failure|kidney failure|কিডনি.*(ফেল|fail)|liver failure|লিভার.*ফেল|dialysis|ডায়ালাইসিস)/i,
  /(tuberculosis|\bTB\b|যক্ষ্মা|\bHIV\b|এইচআইভি|\bAIDS\b|এইডস)/i,
  /(major surgery|বড় অপারেশন|brain tumou?r|ব্রেন টিউমার|complicated pregnancy|জটিল গর্ভ|গর্ভাবস্থার জটিলতা)/i,
];

const MENTAL_HEALTH_PATTERNS: RegExp[] = [
  /(depress|ডিপ্রেশন|হতাশ|anxiety|দুশ্চিন্তা|panic attack|প্যানিক|mental health|মানসিক|মন খারাপ)/i,
];

const MINOR_PATTERNS: RegExp[] = [
  /(fever|জ্বর|\bjor\b)/i,
  /(cold|সর্দি|\bsordi\b|cough|কাশি|\bkashi\b)/i,
  /(headache|মাথাব্যথা|matha betha)/i,
  /(sore throat|গলা ব্যথা|gola betha)/i,
  /(body ache|শরীর ব্যথা|body pain)/i,
  /(diarrh|ডায়রিয়া|পাতলা পায়খানা)/i,
  /(acidity|গ্যাস|অম্লতা|gastric)/i,
  /(allergy|অ্যালার্জি|rash|র্যাশ)/i,
  /(constipation|কোষ্ঠকাঠিন্য|period cramp|পিরিয়ড|minor cut|কাটা|burn|পোড়া|insect|পোকা)/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function detectTaskType(text: string): TaskType {
  if (matchesAny(text, EMERGENCY_PATTERNS)) return "emergency";
  if (matchesAny(text, SERIOUS_PATTERNS)) return "serious";
  if (matchesAny(text, MENTAL_HEALTH_PATTERNS)) return "mental-health";
  if (matchesAny(text, MINOR_PATTERNS)) return "minor";
  return "general";
}

/* ────────────────────────────────────────────────────────────────────
   3. Complexity scoring
   ──────────────────────────────────────────────────────────────────── */

const SYMPTOM_CATEGORIES: RegExp[] = [
  /(fever|জ্বর|\bjor\b)/i,
  /(cough|কাশি|\bkashi\b)/i,
  /(headache|মাথাব্যথা|matha betha)/i,
  /(sore throat|গলা ব্যথা|gola betha)/i,
  /(body ache|শরীর ব্যথা|body pain|শরীরে ব্যথা)/i,
  /(vomit|বমি|\bbomi\b)/i,
  /(diarrh|ডায়রিয়া|পাতলা পায়খানা)/i,
  /(abdominal|পেট ব্যথা|pet betha|তলপেট)/i,
  /(rash|র্যাশ|allergy|অ্যালার্জি)/i,
  /(breath|শ্বাস|\bshash\b)/i,
  /(chest|বুক|\bbuke\b)/i,
  /(dizz|মাথা ঘোরা|matha ghora)/i,
  /(weak|দুর্বল|durbal|ক্লান্ত)/i,
];

const DETAIL_REQUEST_RE =
  /(detail|explain|\bwhy\b|\bhow\b|বিস্তারিত|কেন|কীভাবে|কিভাবে|বুঝিয়ে|আরও জানতে|step by step)/i;

export function detectComplexity(
  text: string,
  taskType: TaskType,
  priorUserTurns = 0
): Complexity {
  if (taskType === "emergency" || taskType === "serious") return "complex";
  if (taskType === "mental-health") return "moderate";

  const symptomCount = SYMPTOM_CATEGORIES.filter((re) => re.test(text)).length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const questionCount = (text.match(/[?？]/g) || []).length;

  if (symptomCount >= 3 || wordCount >= 45 || questionCount >= 3) return "complex";
  if (
    symptomCount >= 2 ||
    wordCount >= 20 ||
    questionCount >= 2 ||
    DETAIL_REQUEST_RE.test(text) ||
    priorUserTurns >= 4
  ) {
    return "moderate";
  }
  return "simple";
}

/* ────────────────────────────────────────────────────────────────────
   4. Routing matrix
   ──────────────────────────────────────────────────────────────────── */

/**
 * Language × mode × task/complexity routing.
 *
 * A hard rule learned from live probes: Ultra 550B is superb in English but
 * occasionally slips Devanagari or fused Latin into long Bangla answers.
 * Super VL and MiniMax are the Bangla-safe models, so Ultra is LAST for every
 * Bangla/Banglish route and FIRST only for English.
 *
 * Flash:
 *   • EN simple/moderate  → MiniMax (designated lightweight) → Ultra → Super VL
 *   • BN simple/moderate  → MiniMax (fast, clean Bangla)     → Super VL → Ultra
 *   • Banglish            → Super VL (best at mirroring romanised Bangla) → MiniMax → Ultra
 *   • complex/serious     → Super VL (strongest safety discipline) → MiniMax → Ultra
 *   • emergency EN        → Ultra (fastest first token) → MiniMax → Super VL
 *   • emergency BN        → MiniMax (fast + clean) → Ultra → Super VL
 *
 * Pro:
 *   • EN                  → Ultra (550B reasoning) → Super VL → MiniMax
 *   • BN / Banglish       → Super VL (cleanest Bangla) → MiniMax → Ultra
 */
function routeKeys(
  mode: ChatMode,
  language: DetectedLanguage,
  taskType: TaskType,
  complexity: Complexity
): ModelKey[] {
  if (mode === "med1-pro") {
    return language === "en"
      ? ["ultra", "supervl", "minimax"]
      : ["supervl", "minimax", "ultra"];
  }

  if (taskType === "emergency") {
    return language === "en"
      ? ["ultra", "minimax", "supervl"]
      : ["minimax", "ultra", "supervl"];
  }
  if (taskType === "serious" || taskType === "mental-health") {
    return ["supervl", "minimax", "ultra"];
  }
  if (complexity === "complex") return ["supervl", "minimax", "ultra"];
  if (language === "banglish") return ["supervl", "minimax", "ultra"];
  if (language === "bn") return ["minimax", "supervl", "ultra"];
  return ["minimax", "ultra", "supervl"];
}

function buildCandidate(key: ModelKey, mode: ChatMode): ModelCandidate {
  const def = MODEL_DEFS[key];
  const pro = mode === "med1-pro";

  return {
    id: def.id,
    key,
    label: def.label,
    shortLabel: def.shortLabel,
    tier: def.tier,
    ttftBudgetMs: (pro ? PRO_TTFT_MS : FLASH_TTFT_MS)[key],
    maxTokens: (pro ? PRO_MAX_TOKENS : FLASH_MAX_TOKENS)[key],
    temperature: pro ? 0.65 : 0.6,
    // Super VL spends far too many tokens at "medium" (observed: whole budget
    // consumed by hidden reasoning), so it always runs at low effort.
    reasoningEffort: pro && key === "ultra" ? "medium" : "low",
  };
}

export function languageHint(language: DetectedLanguage): string {
  switch (language) {
    case "bn":
      return "The patient's latest message is written in Bangla script. Reply in Bangla script with Bangla numerals (e.g. ১০২°F).";
    case "banglish":
      return "The patient's latest message is Banglish — Bangla written in English letters. Reply in Banglish using English letters only; never switch to Bangla script.";
    default:
      return "The patient's latest message is in English. Reply in English.";
  }
}

export function planRoute(params: {
  mode: ChatMode;
  message: string;
  priorUserTurns?: number;
}): RoutePlan {
  const language = detectLanguage(params.message);
  const taskType = detectTaskType(params.message);
  const complexity = detectComplexity(params.message, taskType, params.priorUserTurns || 0);
  const keys = routeKeys(params.mode, language, taskType, complexity);

  return {
    mode: params.mode,
    language,
    taskType,
    complexity,
    languageHint: languageHint(language),
    candidates: keys.map((key) => buildCandidate(key, params.mode)),
  };
}

export const LANGUAGE_LABELS: Record<DetectedLanguage, string> = {
  bn: "Bangla",
  banglish: "Banglish",
  en: "English",
};

/** Model metadata for status/debug surfaces (no secrets). */
export function modelShortLabel(modelId: string): string {
  const found = (Object.keys(MODEL_DEFS) as ModelKey[]).find(
    (key) => MODEL_DEFS[key].id === modelId
  );
  return found ? MODEL_DEFS[found].shortLabel : "MediLink AI";
}
