# Master Product Requirements Document (PRD) — Version 2.0
**Project Name:** MediLink
**Version:** 2.0 (Supersedes v1.0)
**Date:** September 21, 2026
**Development Team:** Sylhet Robotics Club
**Target Platform:** Web (Mobile-First Responsive)
**Language:** English only

---

## 0. Change Log: v1 → v2 (What Changed and Why)

| # | Change | Reason |
|---|---|---|
| 1 | Landing page rebuilt as **8 ordered sections**: Hero → Services → How It Works → Trust Strip → Reviews → FAQ → Plans → Final CTA | v1 landing lacked trust sections (reviews, FAQ, proof) |
| 2 | **The Button Law** introduced (Section 4): max 1 primary button per section, whole-card tap targets, no button clusters | v1 UI felt like "a junction" — button overload |
| 3 | Reviews section uses **real review data from doctors.json** (consistent, mixed ratings, verified tags) | v1 reviews looked like fake placeholders |
| 4 | Doctor card reduced to **tappable row + ONE Book button**; video-call option moved inside detail drawer | Button overload |
| 5 | Service cards reduced to **icon + title + one line + arrow** (no embedded search widgets) | Button overload |
| 6 | Hero reduced to **1 primary CTA + 1 quiet text link + 1 static visual** | Button overload |
| 7 | **Phased Delivery with Build Gates** added (Section 9): max ~15 files per agent pass, human browser test between gates | v1 disaster: one 22-minute agent pass produced 52 broken files |
| 8 | Unchanged from v1: tech approach (Next.js + localStorage), 2 subscription plans, Dr MediLink modes, Emergency SOS, WhatsApp commerce, team & contact data | These were correct in v1 |

---

## 1. Product Vision & Objective

MediLink is an AI-assisted healthcare platform for Bangladesh. It connects patients to:
1. **AI health guidance** (Dr MediLink chatbot)
2. **Medicine ordering** (pharmacy e-commerce)
3. **Doctor booking** (specialist finder)
4. **Emergency response** (SOS 999 + nearby hospitals)

**Operating model:** Guest-first, WhatsApp-driven. No passwords, no emails, no payment gateways. User profiles live in browser localStorage. All commerce is confirmed by humans on WhatsApp.

**Design feeling:** Calm, medical-trust, one clear path per screen. Never a control panel.

---

## 2. User Roles & Definitions

| Role | Definition | Capabilities |
|---|---|---|
| **Guest** | Has not completed soft registration | Browse all pages, use SOS freely, limited AI chats (2/day), checkout with manual info entry |
| **Registered User** | Completed 3-step soft registration (stored in localStorage) | Personalized AI context, auto-filled checkout, discounts, full history, Premium eligibility |

No authentication exists. "Registered" simply means a profile object exists in localStorage.

---

## 3. Subscription & Monetization (Exactly 2 Plans)

### 3.1 Free Plan (Default)
- Price: ৳0
- AI: 2 requests/day, 60/month, Med-1 Flash mode only
- Search: basic keyword search
- Discounts: 0%
- History: last 3 chats / last 3 orders visible
- Booking priority: normal

### 3.2 Premium Plan ("MediLink Premium")
- Price: ৳500 / month
- AI: unlimited (fair use), both Med-1 Flash AND Med-1 Pro modes
- Search: full smart search + AI suggestions
- Discounts: 20% on pharmacy orders AND doctor fees
- History: full local history
- Booking priority: ultra-high (flagged in WhatsApp messages)
- Activation: WhatsApp request message (template §12.4 of Content Sheet) + manual demo toggle in profile

### 3.3 Always Free (Never Gated)
- Emergency SOS, 999 call, nearby hospitals
- Browsing pharmacy, doctors, about, contact, FAQ, reviews

---

## 4. DESIGN DISCIPLINE: THE BUTTON LAW (Binding Rule for All Pages)

Every screen and component MUST obey:

1. **Max ONE primary button per section.** Secondary/ghost actions appear only as text links or inside drawers/modals.
2. **Cards are tappable as a whole.** A card contains zero or one button — never two or three.
3. **Every button must answer "what happens on tap?" in ONE word** (Order, Book, Call, Send, Save, Delete). If it cannot, it is a link, not a button.
4. **No input fields inside marketing cards** (services, reviews, plans, trust strip). Inputs live only on tool screens (pharmacy search, doctor search, chat, forms).
5. **Icon-only controls** (new chat, history, close) are 44×44px tap targets with aria-labels, and never sit next to more than one other icon control.
6. **Button inventory per landing section is fixed** (see Section 6.1 table). Adding any button to the landing page requires explicit PRD amendment.

---

## 5. Core Features & Functional Requirements

### 5.1 AI Chatbot — "Dr MediLink"
- Backend: Google Gemma 27B via OpenRouter, proxied through `/api/chat` (server-side key).
- Modes: **Med-1 Flash** (quick, default) and **Med-1 Pro** (detailed, Premium-only). Segmented control switcher.
- Text-only. **No image upload.**
- Features: new chat, history list, delete conversation (with confirm modal), download conversation as PDF, model switch, streaming responses, typing indicator.
- Context: injects registered profile (name, area, diseases, allergies) into system prompt.
- Safety: never diagnoses, never prescribes dosages, escalates severe symptoms to 999/SOS.
- Limits: Free 2/day; Premium unlimited fair-use. Limit-reached inline card (not blocking modal).

### 5.2 Pharmacy (E-Commerce)
- Medicine grid from `medicines.json` (10 items).
- Search bar (name, generic, category, description keywords) + category chips + sort.
- **Simplified medicine card:** image area, name, generic name, price (৳), Rx badge if required, stock state, ONE "Add" button. No other controls on the card.
- Cart: drawer (desktop) / bottom sheet (mobile); quantity +/-, remove; totals with Premium discount + ৳30 delivery.
- Checkout: modal with editable name/phone/address (auto-filled if registered), WhatsApp message preview, ONE "Send via WhatsApp" button.
- Order saved to localStorage `medilink_orders`.

### 5.3 Doctor Finder
- Doctor list from `doctors.json` (6 items) as **tappable rows**: avatar, name, specialty + experience, area + distance, rating, "from ৳fee", chevron. ONE "Book" button per row.
- Row tap → detail drawer (bio, education, fees table, availability, reviews).
- Inside drawer: TWO actions only — "Book via WhatsApp" (primary) and "Request Video Call" (secondary). Video option exists ONLY here, nowhere else.
- Search + specialty chips + "Nearby" toggle (geolocation, Haversine sort, manual-area fallback).
- Booking generates WhatsApp message (templates §12.2 / §12.3).

### 5.4 Emergency SOS (999)
- Unchanged from v1 (it was correct). Minimal page, big pulsing SOS button, `tel:999`, `sms:999?body=` location draft, WhatsApp location share, nearest 5 hospitals with Call + Directions.
- Accessible to everyone. Zero registration prompts. Zero marketing.

### 5.5 Soft Registration (3 Steps)
- Unchanged structure from v1, tighter spacing: Step 1 identity (name, phone, area), Step 2 health (diseases chips, allergies chips + custom), Step 3 optional (blood group, age, gender, emergency contact) + consent checkbox.
- Skip link always visible. Success state redirects to landing.

---

## 6. Page-by-Page Structure

### 6.0 Global Shell
- Desktop navbar (sticky, blur, logo left, links center, Nearby + Profile/Right side).
- Mobile bottom nav: Home, Dr MediLink, Pharmacy, Doctors, SOS(red). Fixed, 64px + safe-area.
- Footer: dark green-navy, 4 columns, disclaimer band, copyright.

### 6.1 LANDING PAGE — 8 Sections in Exact Order

**Section 1 — HERO**
- Layout: 2-column desktop (55/45), stacked mobile. Mint-to-white gradient + subtle dot pattern.
- Left: badge pill ("Built for Bangladesh"), H1 "Your Health, One Link Away.", subheadline (1 sentence), ONE primary CTA "Chat with Dr MediLink", ONE quiet text link "See how it works ↓".
- Right: ONE static app-preview card (chat mock: 1 user bubble + 1 AI bubble + disclaimer line). Non-interactive. No buttons inside.
- Animation: riseIn stagger (badge 0ms, H1 80ms, sub 160ms, CTA 240ms, preview 400ms).
- Buttons in section: **1**.

**Section 2 — SERVICES**
- Title "Our Services" + subtitle "Tap any service to get started."
- 3 equal cards, whole card tappable (link), each: Lucide icon, title, one-line description, arrow icon.
  - Pharmacy → /pharmacy
  - Find Doctor → /doctors
  - Emergency SOS → /emergency (card tinted emergency-soft, arrow only, no call button here)
- Buttons in section: **0**.

**Section 3 — HOW IT WORKS**
- Title "How MediLink Works".
- 3 numbered steps with connecting line:
  1. "Ask or browse" — Chat with Dr MediLink, or browse pharmacy and doctors.
  2. "Get your plan of action" — AI guidance, a medicine cart, or a doctor shortlist.
  3. "Confirm on WhatsApp" — Real humans confirm orders and bookings. SOS works anytime, free.
- Buttons in section: **0**.

**Section 4 — TRUST STRIP**
- Horizontal band (bg-soft) with 4 honest stats, number + label:
  - "24/7 — AI health guidance"
  - "999 — National emergency integrated"
  - "100% — Orders confirmed on WhatsApp"
  - "৳0 — SOS free for everyone"
- Buttons in section: **0**.

**Section 5 — REVIEWS**
- Title "What Patients Say" + rating summary line: "4.8 / 5 average from 759 patient reviews across listed doctors."
- 3 review cards pulled from doctors.json review data (consistent, not invented):
  - Card: star row (mixed: 5, 5, 4), quote text, reviewer name + area, tag "Verified patient", context line "Patient of Dr. {doctor name}".
- No carousel, no auto-play. Static 3-card grid (1-col mobile).
- Buttons in section: **0**.

**Section 6 — FAQ**
- Title "Frequently Asked Questions".
- Accordion, 6 questions (answers in Content Sheet v2 patch):
  1. Is MediLink free to use?
  2. Is Dr MediLink a real doctor?
  3. How does medicine ordering work?
  4. What happens when I press the SOS button?
  5. What do I get with Premium (৳500/month)?
  6. Is my health data stored on your servers?
- One open at a time. Chevron rotate animation only.
- Buttons in section: **0** (accordion headers are controls, not buttons).

**Section 7 — PLANS**
- Title "Choose Your Plan" + subtitle.
- 2 cards: Free (button "Start Free" → /register) and Premium (badge "Best Value", elevated, button "Get Premium" → WhatsApp request template).
- Each card: price, period, feature list with check icons, ONE button.
- Note banner: "Emergency SOS and basic services are always free — no registration required."
- Buttons in section: **2** (one per card — permitted by Button Law rule 1 per card).

**Section 8 — FINAL CTA BAND**
- Brand-gradient band. Heading "Your health, one link away."
- ONE button: "Create Free Profile" → /register.
- Microcopy: "No password. No email. Takes 30 seconds."
- Buttons in section: **1**.

**Landing button inventory total: 4 primary buttons across 8 sections.** (v1 had 10+.)

### 6.2 REGISTER PAGE
- Centered card 520px, 3 steps, progress dots, chips multi-select, consent, skip link, success state → redirect home. (Per §5.5.)

### 6.3 CHAT PAGE (Dr MediLink)
- Calmer layout: header (avatar, name, online dot, new-chat icon, history icon), sticky disclaimer banner, segmented model switcher (Flash default / Pro locked for Free), message area (mint bg), sticky input bar with ONE send button.
- Sidebar (desktop 320px / mobile bottom sheet): profile summary card with "Edit" text link; usage meter; Premium upsell as ONE button; emergency card with ONE call button + hospitals text link.
- Actions per conversation: delete (confirm modal), download PDF.

### 6.4 PHARMACY PAGE
- Header, search bar, category chips, sort select.
- Grid: 4/2/2 columns. Simplified card per §5.2 (ONE Add button).
- Cart drawer/bottom sheet + mobile sticky summary bar (bar is a tap target opening the cart, not a button cluster).
- Checkout modal per §5.2 (ONE send button).

### 6.5 DOCTOR FINDER PAGE
- Header, search row (input + Nearby toggle), specialty chips.
- Tappable rows per §5.3 (ONE Book button per row).
- Detail drawer with exactly 2 actions.
- Empty state with reset link.

### 6.6 EMERGENCY PAGE
- Unchanged from v1 spec §4.6 / Content Sheet §7.

### 6.7 ABOUT PAGE
- Mission, Why MediLink, services mini-grid (icons only), team grid (4 members with photos + fallback initials), roadmap timeline (4 items).

### 6.8 CONTACT PAGE
- 4 contact cards (Phone, Email, Facebook, Instagram) with native links. No form.

---

## 7. Key User Flows

1. **Guest order:** Landing → Services → Pharmacy → Add items → Cart → Checkout modal (manual info) → WhatsApp → success state.
2. **Registered personalized:** Register → Chat (profile-aware answers) → Pharmacy (auto-fill + discount) → WhatsApp.
3. **Emergency:** Any page → SOS (bottom nav or page) → action sheet → call / SMS draft / hospitals.
4. **Upgrade:** Plans or chat sidebar → Get Premium → WhatsApp request → manual demo activation → Premium badge + discounts active.
5. **Doctor booking:** Doctors → row tap → drawer → Book (WhatsApp) or Video request (WhatsApp).

---

## 8. Data Storage Strategy (Unchanged from v1)

- localStorage keys: `medilink_profile`, `medilink_subscription`, `medilink_chat_history`, `medilink_cart`, `medilink_orders` (Zustand persist).
- Static JSON: `medicines.json` (10), `doctors.json` (6, with reviews incl. reviewer area), `hospitals.json` (5).
- No backend database. No auth. API key server-side only in `/api/chat`.

---

## 9. PHASED DELIVERY PLAN WITH BUILD GATES (Process Fix — Binding)

**Rules for every gate:**
- Agent receives ONE gate prompt at a time. Max ~15 files created/changed per pass.
- Agent must NOT add features outside the gate scope.
- After each gate: human runs `npm run build`, then browser smoke test (checklist below), THEN approves next gate.
- Bug fixes use fix-only prompts: "Fix ONLY this error. Do not touch other files."

| Gate | Scope (max files) | Human Verification Before Next Gate |
|---|---|---|
| **G0** | Scaffold, Tailwind tokens, fonts, globals.css, UI primitives (Button, Input, Card, Chip, Badge, Skeleton, Modal, Drawer, Toast) | Build passes; primitives render on a temp test page |
| **G1** | Types, 3 JSON data files, 5 Zustand stores, libs (whatsapp, geo, pdf-generator, openrouter), `/api/chat` route | Build passes; API route returns streamed test response via curl/Postman |
| **G2** | Layout shell (Navbar, Footer, MobileBottomNav) + FULL Landing page (8 sections) | Build passes; landing renders all 8 sections; button inventory = 4; mobile bottom nav visible |
| **G3** | Register page + Chat page (streaming, history, PDF, limits) | Build passes; register saves profile; chat streams a real Gemma reply; PDF downloads |
| **G4** | Pharmacy page + Doctor Finder page (incl. drawers, checkout, booking) | Build passes; cart math correct with discount; WhatsApp links open with correct encoded message |
| **G5** | Emergency + About + Contact pages | Build passes; tel:/sms:/maps links work on a real phone; team photos or fallbacks render |
| **G6** | Polish pass: empty/error/loading states, toasts, accessibility sweep, reduced-motion, final `npm run build` + `npm run start` | Full smoke test on desktop + 375px; demo rehearsal #1 |

**After G6:** No new features. Fixes only. Demo rehearsals ×3.

---

## 10. Out of Scope (Never Build — Unchanged from v1)

No backend database · No authentication · No payment gateways · No real SMS gateway · No in-app video calling · No image uploads in chat · No admin dashboard · No complex animations (Lottie/parallax/auto-play) · No extra landing sections beyond the 8 defined · No additional buttons beyond the Button Law inventory.

---

## 11. Assets & File Assumptions

- `/public/assets/logo.svg`, `/public/assets/team/{washik,sadi,isaba,sultan}.jpg`, `/public/assets/medicines/*`
- SafeImage fallback component: initials avatar (team/doctors), Pill icon (medicines), text logo (brand).

---

## 12. Known Limitations (State Proactively to Judges)

localStorage-only persistence · WhatsApp-based commerce (no gateway) · Dummy medical catalog · AI guidance only (no diagnosis) · English-only UI · Video calls scheduled via WhatsApp, not in-app.

---
*End of Master PRD v2. Next document: UI/UX Specification v2 (Button Law implementation, 8 landing section designs, simplified card specs). The Technical Architecture Spec v1 and Test Checklist v1 remain valid, with Gate rules from Section 9 replacing the old build order.*
