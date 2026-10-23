# MediLink AI — Complete Project Analysis

> **Purpose of this document:** A single, self-contained reference so that any developer or AI
> agent can understand the entire MediLink AI codebase without reading every file.
> Last analyzed: 2026-10-23 · Whole-site Bangla language switcher + responsive navbar (commit d4d80c4) · Codebase: `/home/carno/Desktop/MEDILINK-AI-main` · Version: 2.0.0

## Recent additions (since 2026-10-20)
- Whole-site Bangla/English language switcher in footer (`src/lib/i18n.ts`, `src/stores/useLanguageStore.ts`); navbar fully responsive.
- Persistent memory system + auto-extraction store + 5-key OpenRouter pool rotation.
- New chat features, memory API, health-log components; high-concurrency perf + Redis init fix.
- 95 unit tests pass; typecheck 0 errors.

--- (বাংলা সারসংক্ষেপ)

- **MediLink AI** বাংলাদেশের জন্য একটি হেলথকেয়ার ওয়েব প্ল্যাটফর্ম: AI ডক্টর চ্যাট (Dr MediLink), ফার্মেসি (WhatsApp অর্ডার), ডক্টর ডিরেক্টরি (WhatsApp বুকিং), ইমার্জেন্সি SOS (999 + হাসপাতাল)। তৈরি করেছে Sylhet Robotics Club।
- **টেক স্ট্যাক:** Next.js 16.4.2 (App Router, Turbopack) + React 19.3 + TypeScript + Tailwind + Zustand। কোনো ডেটাবেস/লগইন/পেমেন্ট নেই — সব ইউজার ডেটা ব্রাউজারের `localStorage`-এ। সার্ভার API routes: `/api/chat` (OpenRouter AI proxy), `/api/consult/summary`, `/api/maps/route-matrix`, `/api/vision/ocr`।
- **চালাতে যা লাগবে:** `OPENROUTER_API_KEY` (`.env.local` ফাইলে) + `npm install` + `npm run dev`।
- **৩টি গুরুত্বপূর্ণ সিদ্ধান্ত (এখনকার অবস্থা):** (১) ✅ **Dynamic model routing** — ভাষা (বাংলা/বাংলিশ/English), মোড (Flash/Pro) ও জটিলতা অনুযায়ী MiniMax M3.1 Flash / Nemotron 3.5 Super VL / Nemotron 3 Ultra 550B থেকে ordered fallback; (২) ✅ **Functional subscription checkout** — `/subscription`-এ bKash/Nagad/Card simulated payment, সফল হলে Premium activate; সব premium CTA এখন checkout-এ যায়; (৩) ✅ per-IP rate limiting + per-model TTFT budget + failure cooldown।
- **ডেমো পেমেন্ট:** ফার্মেসি checkout-এ ২-ধাপের পেমেন্ট UI (bKash/Nagad/Card/COD) **এবং নতুন `/subscription` checkout** (Monthly ৳500 / Yearly ৳4,800, bKash/Nagad/Card, ~1.7s simulated processing, TXN + SUB ID, localStorage-এ premium) — আসল গেটওয়ে নেই, ইচ্ছাকৃতভাবে; Pay সবসময় সফল।
- **চ্যাটবট (সৎ রায়):** physician persona + tiered medical logic (মাইনর = নির্দিষ্ট OTC ওষুধের নাম OK, serious = শুধু গাইডেন্স, শূন্য ওষুধের নাম) প্রম্পটে আছে এবং লাইভ টেস্টে কাজ করছে। নতুন পুলে **MiniMax M3.1 Flash** বাংলা/English দুটোতেই দ্রুত ও প্রাকৃতিক; **Super VL** বাংলায় সবচেয়ে সেফ; **Ultra 550B** English-এ দুর্দান্ত, তবে লম্বা বাংলা উত্তরে মাঝে মাঝে Devanagari slip করে — তাই বাংলা রুটে সেটি শেষ fallback। বাংলা দাঁড়ি (।)-কে ভুলভাবে Devanagari ধরা বাগ ও sanity gate ঠিক করা হয়েছে। বিস্তারিত §7.2/§7.5।

---

## 1. What This Project Is

**MediLink AI** is a healthcare platform for Bangladesh. It is a **static-first Next.js
application** — there is no database, no authentication, and no real payment gateway. All user data
lives in the browser (`localStorage`). Commerce happens over **WhatsApp deep links**
(`wa.me/...`) after an in-app **simulated checkout** (demo payment — clicking Pay always succeeds),
and the server-side logic is limited to a few API routes (AI proxy, consult summary, maps, OCR).

**Brand / owner:** Sylhet Robotics Club, Sylhet, Bangladesh.
**Pages:** Landing, Register (health profile), Chat (Dr MediLink AI), Pharmacy, Doctors,
Emergency, **Subscription (Premium checkout)**, About, Contact.

**Two plans (business model):**

| | Free (৳0) | Premium (৳500/month) |
|---|---|---|
| AI chats | 2 per day (limit enforced client-side) | Unlimited (coded as 999/day) |
| AI modes | Flash only | Flash + Pro |
| Pharmacy discount | 0% | 20% (applied at cart) |
| Doctor fee discount | 0% | 20% (displayed + in WhatsApp message) |
| Chat history | Last 3 sessions in drawer (all still stored) | Full |
| PDF export of chat | ❌ | ✅ |

**Important:** Premium is activated only after the simulated checkout at `/subscription`
(`activatePremium()` after a bKash/Nagad/Card payment). Every premium CTA routes there; there is
still no server-side entitlement check (demo-only). See §9, issue C2.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js **16.4.2** (App Router, Turbopack) | `src/app/`, route group `(main)`; Node.js 20.9+ required |
| Language | TypeScript 5.6, `strict: true` | path alias `@/*` → `./src/*`; Next 16 uses `jsx: react-jsx` |
| UI | React **19.3**, Tailwind CSS 3.4, CSS variables | design tokens in `globals.css` + `tailwind.config.ts` |
| State | Zustand 4.5 + `persist` (localStorage) | 5 stores, 5 storage keys |
| Icons | lucide-react | |
| Markdown | react-markdown + remark-gfm | assistant chat bubbles render GFM tables |
| PDF | jsPDF | premium-only chat export |
| 3D/FX | three.js 0.186 | `ThreeDNAHelix` (hero) + particle canvases |
| Fonts | Montserrat (headings), Inter (body), Hind Siliguri (Bengali) | via `next/font/google` |
| AI | OpenRouter API (`/api/v1/chat/completions`), SSE streaming, **3-model free chain with sequential fallback** | proxied through `src/app/api/chat/route.ts`; per-IP rate limit; per-model TTFT budget + garbled-output sanity gate + cooldowns |
| **Installed but UNUSED** | `framer-motion`, `gsap`, `react-hook-form` | no imports anywhere — safe to remove |

**Scripts:** `npm run dev` · `npm run build` · `npm run start` · `npm run build:demo` · `npm run start:demo` · `npm run typecheck` · `npm test`.

**Next.js 16 notes (2026-10-20 upgrade):** Turbopack is the default bundler for both dev and build; the old custom `webpack` splitChunks config was removed. The `next lint` command was removed (no ESLint config is present), so use `npm run typecheck` + `npm test`. React 19 ref types and the removed `NextRequest.ip` fallback were migrated.

---

## 3. Running the Project (Setup)

```bash
npm install
# 1) Create/edit .env.local  (see §11 — a ready template is included in the repo)
# 2) Paste your OpenRouter key:  OPENROUTER_API_KEY=sk-or-v1-...
npm run dev        # http://localhost:3000
```

- **Production build (recommended for the demo):**
  ```bash
  npm run build && npm run start
  ```
  Next 16 writes dev output to `.next/dev`, so a dev server and a build no longer share the same
  artifacts. The demo isolates its production output to `.next-prod`:
  ```bash
  npm run build:demo && npm run start:demo
  # equivalent to:
  # NEXT_DIST_DIR=.next-prod npm run build
  # NEXT_DIST_DIR=.next-prod npm run start
  ```
  (`next.config.js` honors `NEXT_DIST_DIR`; the default remains `.next`.)
- **TypeScript typecheck passes** (`npm run typecheck` = 0 errors) and the 95 unit tests pass;
  Next.js 16.4.2 production build was verified on 2026-10-20 (18 routes).
- **No `.env` file existed before this analysis.** Without `OPENROUTER_API_KEY` the chat page
  returns `{"error":"OpenRouter API key is not configured"}` (HTTP 500 from `route.ts`).

---

## 4. Repository Map

```
MEDILINK-AI-main/
├── .env.local                  # ⭐ LOCAL SECRETS (created — put API key here; gitignored)
├── .env.example                # template/documentation of env vars
├── PROJECT_ANALYSIS.md         # ⭐ this document
├── package.json                # deps & scripts (v2.0.0, name "medilink")
├── next.config.js              # reactStrictMode:false, image formats, NEXT_DIST_DIR override; Turbopack default
├── tailwind.config.ts          # design tokens: colors/fonts/shadows/radii/zIndex/keyframes
├── tsconfig.json               # strict, noEmit, alias @/* → src/*
├── public/assets/
│   ├── logo.svg
│   └── team/                   # yafi.jpeg, sadi.jpg, isaba.jpeg (+ unused sultan.jpg)
│   # ⚠️ MISSING: public/assets/doctors/*.jpg and public/assets/medicines/*.jpg
│   #    (16 JSON image paths point here → all fall back to SafeImage placeholders)
├── prds/                       # 5 specification documents (the "source of truth")
│   ├── MediLink_PRD_v2.md
│   ├── MediLink_UIUX_Spec_v2.md
│   ├── MediLink-Technical-Architecture-Spec.md
│   ├── MediLink-Test-Checklist-Demo-Script.md
│   └── Content-Sheet-v2.md
├── spec.md / last_prompt.md / user_prompts.jsonl / scratch_request.json
│                               # ⚠️ leftover AI-agent logs from the build process (not app code)
└── src/
    ├── app/
    │   ├── layout.tsx           # <html>, fonts, global metadata
    │   ├── globals.css          # CSS variables + primitives (.btn .input-field .card .chip .badge) + keyframes
    │   ├── api/chat/route.ts    # ⭐ routing + OpenRouter SSE proxy
    │   ├── api/vision/ocr/route.ts # attachment OCR endpoint
    │   └── (main)/              # all user-facing pages, wrapped by Navbar/Footer/MobileBottomNav
    │       ├── layout.tsx       # ToastProvider + Navbar + <main> + Footer + MobileBottomNav
    │       ├── page.tsx         # Landing (/)
    │       ├── chat/page.tsx    # Dr MediLink chat
    │       ├── pharmacy/page.tsx
    │       ├── doctors/page.tsx
    │       ├── emergency/page.tsx
    │       ├── register/page.tsx# 3-step profile wizard
    │       ├── subscription/page.tsx # ⭐ Premium checkout + active plan
    │       ├── about/page.tsx   # mission + team (Sylhet Robotics Club)
    │       └── contact/page.tsx # phone/email/social cards
    ├── components/
    │   ├── landing/             # HeroSection, ThreeDNAHelix, HeroParticleCanvas, ServicesSection,
    │   │                        # TrustStripSection, ReviewsSection, FAQSection, PlansSection,
    │   │                        # FinalCTASection, (+ HowItWorksSection = DEAD CODE, unused)
    │   ├── layout/              # Navbar, Footer (hidden on /chat /emergency /register), MobileBottomNav
    │   ├── chat/                # ChatHeader, ChatMessages, ChatInput (voice input), ChatSidebar,
    │   │                        # HistoryDrawer, SuggestedPrompts, LimitReachedCard, SegmentedControl, DeleteModal
    │   ├── pharmacy/            # MedicineCard, CartDrawer, CartSummaryBar, CheckoutModal, OrderSuccessModal
    │   ├── doctors/             # DoctorRow, DoctorDetailDrawer
    │   ├── emergency/           # SOSButton (tel:999), EmergencyActions (SMS/WhatsApp), HospitalList
    │   └── ui/                  # Button, Input, Card, Chip, Badge, Modal, Drawer, Toast, Skeleton, SafeImage, TextLink
    ├── data/                    # static JSON: medicines(10), doctors(6), hospitals(5)
    ├── lib/                     # model-router.ts (⭐ language/mode/task routing), openrouter.ts
    │                            # (prompts + OpenRouter client), whatsapp.ts, geo.ts, pdf-generator.ts,
    │                            # attachments.ts + vision.ts (upload/OCR), dose-parse.ts
    ├── stores/                  # useProfileStore, useSubscriptionStore, useChatStore, useCartStore,
    │                            # useOrderStore, useAttachmentStore
    └── types/index.ts           # Medicine, Doctor, Hospital, Profile, Subscription, ChatSession, CartItem, Order, Attachment
```

---

## 5. Routes & Pages

| Route | Type | What it does | Key files |
|---|---|---|---|
| `/` | client | Landing: Hero (typewriter + DNA helix + particles) → Services bento → Trust stats → Reviews marquee → FAQ accordion → Plans → Final CTA | `components/landing/*` |
| `/chat` | client | Dr MediLink AI chat: streaming, model picker (Flash/Pro), history drawer, PDF export (premium), 2/day free limit, voice input (Web Speech API), read-aloud, copy, in-chat rate-limit/error messages | `app/(main)/chat/page.tsx`, `components/chat/*` |
| `/pharmacy` | client | Medicine catalog (search, category chips, sort), cart drawer, **2-step checkout with simulated payment (bKash/Nagad/Card/COD)** → payment-success modal (Order ID + TXN ID, optional "Send Order on WhatsApp"); order saved locally | `components/pharmacy/*`, `useCartStore` |
| `/doctors` | client | Doctor directory (search, specialty chips, **Nearby** via geolocation + Haversine sort), detail drawer → WhatsApp chat/video booking, premium fee discount | `components/doctors/*`, `lib/geo.ts` |
| `/emergency` | client | Location banner (GPS → manual area fallback), big SOS button (`tel:999`), SMS/WhatsApp location share, nearby hospital list with Call/Directions | `components/emergency/*`, `data/hospitals.json` |
| `/register` | client | 3-step wizard: basic info (+880 phone) → health profile (conditions/allergies chips + custom) → optional (blood, age, gender, emergency contact) → success | `app/(main)/register/page.tsx` |
| `/subscription` | client | Premium checkout: Monthly ৳500 / Yearly ৳4,800 plan selector, benefits, bKash/Nagad/Card simulated payment, validation, ~1.7s processing → success receipt (SUB ID + TXN ID) → active-subscription panel on return; activates `useSubscriptionStore` | `app/(main)/subscription/page.tsx`, `useSubscriptionStore` |
| `/about` | client | Mission, pillars, team bento (Yafi founder, Sadi dev, Isaba designer) | `app/(main)/about/page.tsx` |
| `/contact` | client | Phone/email/Facebook/Instagram cards + "Sylhet Robotics Club" badge | `app/(main)/contact/page.tsx` |
| `POST /api/chat` | server | Per-IP rate limit → validates body & caps payload → **context-aware routing** (language × mode × task/complexity) over a 3-model free pool → per-model TTFT budgets, corrupt-output sanity gate, failure cooldowns, repetition circuit breaker → streams visible content (hidden reasoning stripped) as `text/plain` with `X-MediLink-Model/-Language/-Task/-Complexity` headers | `app/api/chat/route.ts`, `lib/model-router.ts`, `lib/openrouter.ts` |

---

## 6. Data & State Architecture

**All persistence is browser-localStorage (Zustand `persist`). No server DB.**

| Store | localStorage key | Contents |
|---|---|---|
| `useProfileStore` | `medilink_profile` | name, phone, area, diseases[], allergies[], bloodGroup, ageGroup, gender, emergencyContact, consentGiven |
| `useSubscriptionStore` | `medilink_subscription` | plan ("free"/"premium"), activatedAt, billingCycle ("monthly"/"yearly"), transactionId, subscriptionId; `activatePremium(cycle, txnId, subId)`, `isPremium()` |
| `useChatStore` | `medilink_chat_history` | sessions[] (id, title, modelUsed, messages[]), activeSessionId, selectedModel, dailyUsage{date,count}; limit = 2/day free |
| `useCartStore` | `medilink_cart` | items[]; helper math: subtotal, 20% premium discount, flat ৳30 delivery |
| `useOrderStore` | `medilink_orders` | orders[] (free shows last 3) |

**Static data (`src/data/`):**
- `medicines.json` — 10 items (Paracetamol, ORS, Omeprazole, Cetirizine, Vitamin C, Ibuprofen, Antiseptic Cream, Cough Syrup, Multivitamin, Amoxicillin [`requiresRx:true`]). Fields: id, name, genericName, category, price, stock, requiresRx, image, description.
- `doctors.json` — 6 doctors: Dr. Karim Ahmed (Cardiology), Salma Begum (Pediatrics), Rafiq Islam (Dermatology), Nusrat Jahan (Gynecology), Tanvir Hossain (General Physician), Ayesha Siddiqua (Neurology). Each: fees (`feeWhatsapp`, `feeVideo`), area, lat/lng, rating, reviews[2]. **All share the same `whatsappNumber` (8801811389672).**
- `hospitals.json` — 5 hospitals (Dhaka Medical, Square, Sylhet MAG Osmani, Chattogram Medical, Rajshahi Medical) with phone + coordinates.

**Geo:** `lib/geo.ts` — `AREA_COORDINATES` for 13 areas, Haversine distance, `getCurrentLocation()` (8s timeout) with graceful fallback to profile area → Dhaka.

---

## 7. The AI Chatbot — "Dr MediLink"

### 7.1 Flow
```
chat/page.tsx handleSend(text)
  → addMessage(user) + addMessage(empty assistant)
  → POST /api/chat { messages: [history…, newUserMsg], model, profile }
  → route.ts: per-IP rate limit (429 + Bangla message if over) → sanitize payload
               (≤16 messages, ≤2000 chars each)
               → planRoute({ mode, lastUserMessage, priorUserTurns })
                 • language  : Bangla script (bn) / Banglish markers / English (en)
                 • task      : emergency | serious | mental-health | minor | general
                 • complexity: simple | moderate | complex
               → buildSystemPrompt(mode, profile, languageHint)
  → ordered free-model candidates from routeKeys(mode, language, task, complexity):
        Flash EN      : MiniMax → Ultra → Super VL
        Flash BN      : MiniMax → Super VL → Ultra (serious/complex: Super VL first)
        Flash Banglish: Super VL → MiniMax → Ultra
        Emergency     : EN Ultra first / BN MiniMax first (prompt still enforces 999)
        Pro EN        : Ultra → Super VL → MiniMax
        Pro BN/Banglish: Super VL → MiniMax → Ultra
     Per candidate: reasoning effort (Pro Ultra = medium, others low),
     max_tokens (Flash 3–5k / Pro 6–10k), TTFT budget (Flash 10–24s / Pro 15–25s).
     A model fails on: HTTP error / no usable visible content within its budget /
     corrupt opening (Assamese, Devanagari, mixed-script, leaked reasoning, repetition).
     Failed models get a cooldown (30s–5min) so later requests skip them.
  → SSE parsed server-side (reasoning deltas hidden); first 72 sane chars flushed
     immediately (fast first token), then live streaming with a repetition /
     reasoning-leak circuit breaker
  → response headers: X-MediLink-Model(-Label), -Mode, -Language(-Code), -Task,
     -Complexity, -Models-Tried (ASCII-only values)
  → client appends chunks to the last assistant message, then shows the routed
     language/model badge in the chat header
  → incrementDailyUsage() when the stream completes
  → error paths show friendly in-chat messages: 429 rate-limit / 503 all-models-busy /
     partial answer preserved + notice if the stream dies mid-way
```

### 7.2 Model pool & routing (`src/lib/model-router.ts`) — verified 2026-10-20
Live-probed every accessible free model (EN + BN + Banglish). Gemma 4 endpoints returned persistent
upstream 429; Inkling models are restricted to the agent harness; several others garbled Bangla or
burned the whole token budget on hidden reasoning. Three survivors form the pool:

| Model ID | Context | Role | Observed TTFT | Notes |
|---|---|---|---|---|
| `minimax/minimax-m3.1-flash:free` | 1M | Flash primary (EN + BN) | 1.4–4.5s | Fast, natural Bangla and English; clean script; minor typos possible |
| `nvidia/nemotron-3.5-super-vl:free` | 1M | BN safety / Pro BN primary | 2.8–6.8s (25s+ under congestion) | Best Bangla voice and safety discipline; reasoning model — always `effort:"low"` (medium can consume the entire budget with zero visible text) |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1M | EN Pro primary; last BN fallback | 1.2–5.5s | Best structured English Pro answers; occasionally slips Devanagari/fused Latin into long Bangla, hence last for BN |

**Routing matrix** (`routeKeys` — actual order tried):

| Mode | Detected language / task | Order |
|---|---|---|
| Flash | English | MiniMax → Ultra → Super VL |
| Flash | Bangla minor/moderate | MiniMax → Super VL → Ultra |
| Flash | Banglish | Super VL → MiniMax → Ultra |
| Flash | Serious / mental-health / complex | Super VL → MiniMax → Ultra |
| Flash | Emergency EN | Ultra → MiniMax → Super VL |
| Flash | Emergency BN | MiniMax → Ultra → Super VL |
| Pro | English | Ultra → Super VL → MiniMax |
| Pro | Bangla / Banglish | Super VL → MiniMax → Ultra |

- **Ultra is last for every Bangla/Banglish route** — the single most important routing lesson from probes.
- Free endpoints have **queue-congestion waves** — identical requests can take 3s or 30s+. Per-model
  TTFT budgets + cooldowns + graceful 503 absorb this.
- `X-MediLink-*` response headers report the actual route, model, language, task and attempt count.

### 7.3 System prompts (`openrouter.ts` → `buildSystemPrompt`)
Rebuilt for the competition: one shared persona + a mode style layer + three mini style examples.

- **Persona:** "Dr MediLink" — a warm, experienced Bangladeshi physician voice. Must never sound
  like a generic AI (no "As an AI…", no capability lists, no robotic closers); mirrors the
  patient's language (Bangla / Banglish / English / mixed) and uses Bangla numerals in Bangla text.
- **Proactive by design:** every reply ends with one focused follow-up question or one concrete
  next step; asks the 1–2 questions a real doctor needs (duration, severity, associated symptoms).
- **Tiered medical logic (core rule):**
  - **Tier 1 — minor (fever, cold, headache, mild diarrhea, acidity…):** may name specific common
    medicines (generic + BD brand: Napa/Paracetamol, Orsaline-N, Entacyd, Sergel, Alatrol…) with
    label-level guidance only; never antibiotics/steroids; dengue rule = paracetamol only + warning
    signs → hospital.
  - **Tier 2 — needs a doctor soon:** OTC relief only, no prescription names; names the right
    specialty and what the visit will involve.
  - **Tier 3 — serious/complex (cancer etc.):** **zero medicine names** — empathy + practical next
    steps + specialist/hospital type + questions to ask the doctor; no prognoses or timelines.
  - **Emergency red flags:** short ≤60-word block → 999 / MediLink SOS. Suicidal ideation → helpline immediately.
  - Stored allergies/conditions are respected silently (never recited back).
- **Flash style:** compact prompt (~1k tokens) → 40–90 words, max 3 short bullets, ends with one
  question/next step; tuned for the fastest possible first token.
  **Pro style:** full prompt (~2.5k tokens) → 250–450 words, 3–4 short paragraphs with **bold
  labels** (no `#` headings or tables), ends with a question + next step.
- Few-shot examples (Banglish fever / Bangla serious / emergency) lock in the voice; an explicit
  language hint is injected for Banglish so the model mirrors romanised Bangla instead of switching
  to Bangla script, and a script-purity rule forbids Devanagari characters inside Bangla words.

The old "v1.0 behavior spec" prompts (from `last_prompt.md`) are superseded by this design — see §9 H3.

### 7.4 Chat UX features
- Streaming with stop button (AbortController); "Dr MediLink is typing…" animation while empty.
- Markdown rendering for assistant replies (GFM tables styled); user bubbles plain text.
- Copy button; **Listen** (browser speechSynthesis, auto-detects Bengali script → `bn-BD`).
- Voice input via Web Speech API (`bn-BD`-capable browsers; falls back to alert if unsupported).
- Suggested prompts now **mixed-language** (Banglish / Bangla / English) to showcase multilingual support; profile-disease prompts still seeded when a profile exists.
- History drawer (free = last 3 shown), delete with confirm modal, new chat, PDF export (premium).
- Free limit → `LimitReachedCard` → navigates to `/subscription` (no local premium toggle).
- After each reply the chat header shows the routed language + serving model (from the
  `X-MediLink-*` response headers) for transparent demo debugging.
- **Error paths are friendly and in-chat:** the server's 429 rate-limit message and 503
  all-models-busy message are shown verbatim; if a stream dies mid-answer, the partial text is
  preserved and a short notice is appended instead of wiping the message.

### 7.5 Is it "okay as a doctor"? — assessment (updated after live testing)
**Paper safety rails: good — and now verified working in practice.** Live replies look like:
*“দুই দিনের জ্বর আর মাথাব্যথা — সাধারণ ভাইরাল জ্বর হতে পারে... Napa/Paracetamol ৫০০mg লেবেলের
নিয়ম অনুযায়ী...”* followed by a focused question. Natural, proactive, and inside the intended
medicine policy.

**Verified strengths (2026-10-20 live tests):**
1. **Language mirroring works**: Banglish in → Banglish out (MiniMax/Super VL); Bangla in → Bangla out with Bangla numerals; English in → English out.
2. **Tiered medicine policy works**: fever → Napa/Paracetamol with label-level guidance; cancer/serious → **zero specific medicine names** (only treatment categories + specialist/hospital guidance).
3. **Quality with the new pool:** MiniMax M3.1 Flash is fast and natural in both Bangla and English; Super VL is the safest Bangla voice; Ultra 550B produces the most structured English Pro answers.
4. **Resilience engineering:** ordered fallback + per-model TTFT budgets + corrupt-output sanity gate + degenerate-repetition circuit breaker + per-IP rate limiting + failure cooldowns + routed-model badges.
5. **Subscription funnel:** every premium CTA lands on `/subscription`; the simulated payment activates Premium and unlocks Pro mode on `/chat`.

**Remaining risks (be honest for the demo):**
1. **Super VL free-tier congestion** can exceed the 25s Pro TTFT budget; the route then falls back to MiniMax (clean, slightly less deep) or Ultra.
2. **Ultra 550B occasionally slips Devanagari or fused Latin into long Bangla answers.** That is why Ultra is the *last* fallback on every Bangla/Banglish route; a mid-stream script slip is tolerated rather than truncating an otherwise good answer.
3. **Free-tier congestion waves** can make every model slow at the same moment; then the chat shows the friendly “সব AI মডেল ব্যস্ত” message instead of an answer.
4. **Safety is prompt + gates, not a deterministic red-flag keyword guard** (H1 still open — cheap to add).
5. It remains a **guidance/triage assistant, not a diagnostician** — emergency care always routes to 999.

---

## 8. WhatsApp Commerce & SOS Templates (`src/lib/whatsapp.ts`)

| Template | Used by | Notes |
|---|---|---|
| `generatePharmacyOrderMessage` | OrderSuccessModal (after the simulated payment) | items, subtotal, discount %, ৳30 delivery, total, **payment method + TXN ID** |
| `generateDoctorBookingMessage` | DoctorDetailDrawer | includes allergies + plan; discount applied to fee |
| `generateDoctorVideoBookingMessage` | DoctorDetailDrawer | date/time preferred fields |
| `generatePremiumRequestMessage` | ❌ **never used** | the intended "request Premium via WhatsApp" flow — wire this up |
| `generateEmergencyAlertMessage` | EmergencyActions | name, phone, Google Maps location link, allergies/conditions |

Default WhatsApp number: `process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801811389672"`.
Numbers must be digits-only with country code (`wa.me` strips other characters anyway).

---

## 9. Known Issues & Improvements (prioritized)

### 🔴 Critical (fix before real users)
- **C1 — Broken primary model ID.** ✅ **Fixed (2026-10-20):** replaced by a live-probed, all-free
  3-model pool with **language/mode/task-aware routing** — MiniMax M3.1 Flash, Nemotron 3.5 Super VL,
  Nemotron 3 Ultra 550B (see §7.2). Gemma/xingchen/Lightning fully removed.
- **C2 — Premium is free for everyone.** ✅ **Fixed for the demo (2026-10-20):** the direct
  `setPlan("premium")` toggles were removed from `PlansSection`, `Navbar`, `LimitReachedCard` and
  `ChatSidebar`; every CTA now navigates to `/subscription`, which runs a simulated bKash/Nagad/Card
  checkout and calls `activatePremium()` on success. ⚠️ Still client-side only — production must
  validate entitlements server-side (M7).
- **C3 — No rate limiting on `/api/chat`.** ✅ **Fixed:** in-memory per-IP sliding-window rate limiter
  (default **12 requests/min**, tunable via `CHAT_RATE_LIMIT_PER_MIN`). Over-limit requests get HTTP
  429 + a friendly Bangla message shown in the chat. Payload caps: 16 history messages, 2000
  chars/message; upstream error details are no longer echoed. (In-memory state resets on redeploy —
  fine for the demo; use Redis/Upstash for production.)
- **C4 — Missing `.env`.** Before this analysis the project had no env file, so chat always
  errored. ✅ Fixed: `.env.local` + `.env.example` now exist (§11).

### 🟠 High
- **H1 — Chat safety net.** Add a server-side red-flag keyword detector (EN/Bangla/Banglish:
  chest pain, শ্বাসকষ্ট, বুকে ব্যথা, রক্তক্ষরণ, জ্ঞান হারানো…) that returns the fixed 999 message
  without calling the model. Cheap, deterministic, big safety win.
- **H2 — Bangla quality (updated 2026-10-20).** ✅ Resolved by routing, not by one fixed chain:
  Bangla/Banglish requests use **MiniMax/Super VL first and Ultra last**, because Ultra occasionally
  slips Devanagari into long Bangla. Super VL remains the safest Bangla voice for serious/complex
  cases; MiniMax is the fast, clean default. Free-tier congestion waves (all models slow at once →
  friendly 503) are environmental and absorbed by cooldowns.
- **H3 — Behavior-spec drift (now intentional).** The prompts were deliberately rebuilt for the
  competition brief: natural physician voice + tiered medicine policy (see §7.3), which supersedes
  the older `last_prompt.md` "v1.0" spec (verbatim prompts, ≤80-word Flash, 🚨/⚠️/✅ situation color
  blocks). Remaining gaps if the old spec still matters: the **color-block renderer** for situation
  lines is not implemented in `ChatMessages.tsx`, and `pdf-generator.ts` still leaves `|` table
  pipes/emoji. Decide which behavior spec wins before launch.
- **H4 — Copy vs. reality.** Plans copy says "60 AI requests per month" (not implemented);
  TrustStrip says 98% accuracy, ServicesSection says 98.7%; "50,000+ patients" claim vs 6 doctors /
  10 medicines in the catalog. Content-Sheet-specified testimonial names were replaced with invented
  ones. Align marketing copy with the Content Sheet to avoid trust/compliance problems.
- **H5 — Daily-limit bypass.** Tapping ⏹ Stop aborts the fetch before `incrementDailyUsage()`, so
  free users can chat indefinitely. Count usage when the request starts (or on abort too).

### 🟡 Medium
- **M1 — Dead code & repo hygiene:** `HowItWorksSection.tsx` is unused; `sultan.jpg` unused;
  repo root contains agent logs (`spec.md`, `last_prompt.md`, `user_prompts.jsonl`,
  `scratch_request.json`) and `tsconfig.tsbuildinfo`. Remove from production; expand `.gitignore`.
- **M2 — Missing assets:** all 16 `/assets/doctors/*.jpg` + `/assets/medicines/*.jpg` files are
  absent — SafeImage fallbacks cover them, but the UI looks placeholder-y. Add real images or remove
  the paths.
- **M3 — Accessibility:** clickable `<div>`s without keyboard support (`DoctorRow`,
  HistoryDrawer rows), nested interactive elements (`HospitalList` wraps `<Button>` in `<a>`),
  `SegmentedControl` has no `role`/`aria-selected`, FAQ removes focus outlines, marquees/canvases
  ignore `prefers-reduced-motion`, no `aria-live` for streaming text.
- **M4 — Tailwind drift:** `duration-400`, `hover:scale-115`, `shadow-xs` are used but not defined →
  silent no-ops. `TrustStripSection` grid classes cancel the 4-column desktop layout. Footer uses a
  `.giant-text-watermark` class that exists in no stylesheet.
- **M5 — Code quality bugs:** `useCountUp` called inside `.map()` (`TrustStripSection` — Rules of
  Hooks violation); canvas `removeEventListener` calls pass fresh anonymous functions (listener
  leaks) and `dpr` is clamped to 1 (blurry on retina); `SafeImage` never resets its error state when
  `src` changes; `MedicineCard` `setTimeout` not cleaned on unmount.
- **M6 — UX gaps:** no regenerate/edit message; no retry button on chat error; cart totals shown
  with mixed precision (`toFixed(2)` vs raw); decrementing quantity from 1 silently deletes the
  item; free users can't clear all history (`clearAllSessions` exists but is not exposed).
- **M7 — Production readiness:** all doctors share one WhatsApp number; Premium uses a **simulated
  checkout** with no real payment gateway or server-side entitlement verification; no privacy policy
  page though health data (localStorage + sent to OpenRouter) is collected; profile is trusted from
  the client.

### 🟢 Low / Nice-to-have
- Remove unused deps `framer-motion`, `gsap`, `react-hook-form` (bundle savings).
- **Bundle size:** a clean production build (2026-10-18) shows First Load JS of **440–456 kB**
  (single 438 kB vendor chunk). Worth profiling — remove unused deps, lazy-load heavy modules.
- SEO: add `robots.txt`, `sitemap.xml`, OpenGraph/Twitter metadata, per-page titles.
- Add error boundaries, loading skeletons for lists, and a `not-found.tsx`/`error.tsx`.
- Add tests (there are none) — at minimum unit tests for cart math, geo, and prompt building.
- Consider a Bengali/English UI language toggle (Bengali font is already loaded).
- `next.config.js` sets `reactStrictMode: false` — turn it back on when convenient to catch
  double-render bugs.

---

## 10. How the Main Flows Work (cheat-sheet for AI agents)

1. **Chat:** `chat/page.tsx` → `POST /api/chat` (per-IP rate-limited) → `planRoute()` detects
   language/task/complexity → `buildSystemPrompt(mode, …)` → ordered free-model candidates
   (per-model TTFT budgets + corrupt-output sanity gate + cooldowns; hidden reasoning stripped) →
   visible text chunks appended to the last assistant message → routed badge from `X-MediLink-*`
   headers → usage counter +1.
2. **Register:** 3 steps → `useProfileStore.setProfile()` → all features read `profile` for
   personalization (chat context, checkout defaults, SOS message, suggested prompts).
3. **Pharmacy order:** add to cart → "Proceed to Checkout" → step 1 details (profile-prefilled) →
   step 2 payment method (bKash/Nagad/Card/COD, demo values pre-filled) → "Pay" → ~1.7s simulated
   processing → order saved with payment method + TXN ID, cart cleared → success modal
   (Payment Successful + summary; optional "Send Order on WhatsApp").
4. **Doctor booking:** doctors page (optional Nearby geo-sort) → drawer → WhatsApp message with
   chosen fee (premium −20%) → opens `wa.me`.
5. **Emergency:** on mount tries GPS → fallback profile area → Dhaka; SOS button = `tel:999`;
   actions = SMS draft + WhatsApp share with Google-Maps location; hospital list sorted by distance.
6. **Premium (demo):** any "Get Premium"/Premium CTA → `/subscription` → choose Monthly/Yearly →
   bKash/Nagad/Card (demo values pre-filled) → Pay → ~1.7s simulated processing →
   `activatePremium(cycle, txnId, subId)` → success receipt; on return the page shows the active
   subscription. Premium unlocks unlimited chat, Pro mode, 20% discounts and PDF export.

---

## 11. Environment Variables

| Variable | Required | Used by | Format / example | Purpose |
|---|---|---|---|---|
| `OPENROUTER_API_KEY` | ✅ Yes | `src/app/api/chat/route.ts` | `sk-or-v1-...` (get from https://openrouter.ai/settings/keys) | Authenticates the AI proxy. Without it the chat API returns HTTP 500. |
| `CHAT_RATE_LIMIT_PER_MIN` | Optional | `src/app/api/chat/route.ts` | `12` | Max chat requests per IP per minute (stability guard for the free-model demo). Defaults to `12` if unset. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional | `src/lib/whatsapp.ts` | `8801811389672` (digits only, country code, no `+`) | Fallback WhatsApp number for pharmacy orders / SOS share. Defaults to `8801811389672` if unset. |

Files provided in the repo root:
- **`.env.local`** — the file YOU edit (git-ignored). Paste the real API key here.
- **`.env.example`** — documented template (safe to commit).

Notes: Next.js loads `.env.local` automatically for `next dev` / `next build` / `next start`.
Restart the dev server after changing values. Never commit real keys.

---

## 12. Source Documents (`prds/`) — what each says

| Document | Purpose |
|---|---|
| `MediLink_PRD_v2.md` | Master product requirements: pages, 2 plans, guest-first, WhatsApp-driven, no auth/DB/payment, localStorage keys, G0–G6 build phases |
| `MediLink_UIUX_Spec_v2.md` | Design tokens, fonts, spacing, Button Law (max one primary button per section), component specs, states, data schemas, WhatsApp templates |
| `MediLink-Technical-Architecture-Spec.md` | Stack, folder structure, 4 stores, env vars, AI proxy design, system-prompt rules |
| `MediLink-Test-Checklist-Demo-Script.md` | QA checklist + 7-minute live demo script (v1-era; some checks reference removed features) |
| `Content-Sheet-v2.md` | Single source of truth for ALL copy and dummy data (10 medicines, 6 doctors, 5 hospitals, exact strings, WhatsApp templates) |

The latest behavioral addendum ("Dr MediLink — AI Behavior & Response Design Specification v1.0")
lives in `last_prompt.md` (also inside `user_prompts.jsonl`). It supersedes prompt §5.2 of the
Technical Architecture Spec — but was **superseded by the competition redesign** (natural-physician
persona + tiered medicine policy, §7.3); see §9 H3 for what remains if the old spec still matters.
