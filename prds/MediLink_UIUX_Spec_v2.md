# UI/UX Design Specification — Version 2.0
**Project Name:** MediLink
**Version:** 2.0 (Supersedes UI/UX Spec v1)
**Companion Document:** Master PRD v2 (section order, Button Law, gates)
**Design Feeling:** Calm, medical-trust, one clear path per screen. Never a control panel.

---

## 0. Change Summary v1 → v2

| # | Change |
|---|---|
| 1 | Landing rebuilt as 8 sections with fixed button inventory (4 primary buttons total) |
| 2 | New components specified: Accordion, StatItem, ReviewCard, StepItem, SegmentedControl, CtaBand |
| 3 | Service cards: whole-card link, zero buttons, zero inputs |
| 4 | Doctor card → tappable row with ONE Book button; video action only inside drawer |
| 5 | Medicine card: ONE Add button only |
| 6 | Chat: segmented model control; sidebar actions reduced to links + max 2 buttons |
| 7 | Hero right side: ONE static preview card, non-interactive |
| 8 | Design tokens, fonts, colors, shadows, anti-slop rules: UNCHANGED from v1 (they were correct) |

---

## 1. Design Tokens (Unchanged from v1 — Restated for Self-Containment)

### 1.1 Colors
```css
:root {
  --bg-main:#FFFFFF;  --bg-soft:#EBF3FA;  --bg-mint:#F0FAF6;
  --text-primary:#1A2B4C;  --text-muted:#5B6B85;  --text-inverse:#FFFFFF;
  --brand:#17786F;  --brand-dark:#0F5C55;  --brand-light:#E6F4F1;  --brand-soft:#2BA89B;
  --hero-from:#0E3B3A;  --hero-to:#17786F;
  --accent:#F59E0B;  --accent-soft:#FEF3C7;
  --emergency:#D92D20;  --emergency-soft:#FEECEC;
  --success:#16A34A;  --success-soft:#E8F7EE;
  --border:#D9E6F2;  --border-soft:#EAF1F8;
  --whatsapp:#25D366;
}
```

### 1.2 Typography
- Headings: Montserrat (600/700/800). Body: Inter (400/500/600). Bengali fallback: Hind Siliguri.
- Scale: H1 32/48px · H2 24/34px · H3 18/20px · Body 16px/1.6 · Small 14px · Caption 12px · Price 20/24px Montserrat 700.

### 1.3 Spacing / Radius / Shadow / Breakpoints
- Spacing 8px system: 4/8/12/16/24/32/48/64/96.
- Section padding: 48px mobile / 96px desktop. Card padding 24px. Card gap 24px. Max width 1200px. Side padding 16/32px.
- Radius: 8 / 12 / 16 / 24 / 999. Shadows: sm / md / lg (navy-tinted rgba(26,43,76,…)).
- Breakpoints: <640 mobile · 640–1023 tablet · ≥1024 desktop · ≥1280 wide.

---

## 2. THE BUTTON LAW — Component-Level Rules

1. **Variants remain:** Primary (brand), Secondary (white + brand border), Ghost, Emergency (red), WhatsApp (green). Sizes: L 52px, M 44px, S 40px, Icon 44×44.
2. **TextLink component (new):** 14–15px, weight 600, color var(--brand), underline on hover, optional arrow icon 16px. Use TextLink wherever v1 used a secondary/ghost button that was not the section's main action.
3. **One primary per section.** A second visible action must be TextLink or live inside a drawer/modal.
4. **Whole-card tap:** Cards that navigate are `<a>` wrappers with hover translateY(-2px) + shadow-md. They contain ZERO buttons.
5. **Icon controls:** max 2 icon-only controls per header/bar; 44×44 tap target; aria-label required.
6. **Button inventory is frozen per page** (table below). Any addition = PRD amendment.

### 2.1 Frozen Button Inventory
| Page | Primary buttons | Where |
|---|---|---|
| Landing | 4 | Hero CTA (1), Plans cards (1 each), Final CTA band (1) |
| Register | 1 per step | Next / Complete (Back = Ghost, Skip = TextLink) |
| Chat | 3 (tool screen) | Send, Sidebar upgrade, Emergency call |
| Pharmacy | 1 per card + 1 | Add (per card), Send via WhatsApp (checkout modal) |
| Doctors | 1 per row + 2 in drawer | Book (row), Book + Video (drawer only) |
| Emergency | 1 + 2 in sheet | SOS, then Call/SMS/Share inside action sheet (emergency exception) |
| About / Contact | 0 | Native links only |

---

## 3. New & Updated Components

### 3.1 ServiceCard (whole-card link, zero buttons)
```css
.service-card { display:block; padding:28px; border-radius:16px; background:#fff;
  border:1px solid var(--border-soft); box-shadow:var(--shadow-sm); }
.service-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--border); }
.service-card .icon { width:44px; height:44px; border-radius:12px; background:var(--brand-light);
  display:grid; place-items:center; color:var(--brand); margin-bottom:16px; }   /* Lucide 22px */
.service-card h3 { font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:8px; }
.service-card p  { font-size:14px; color:var(--text-muted); line-height:1.55;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.service-card .arrow { margin-top:16px; color:var(--text-muted); transition:transform 180ms, color 180ms; }
.service-card:hover .arrow { transform:translateX(4px); color:var(--brand); }
```
Emergency variant: background var(--emergency-soft); border rgba(217,45,32,.22); icon color var(--emergency); title color #B42318.

### 3.2 StepItem (How It Works)
```css
.step { position:relative; padding-left:56px; }                 /* mobile: vertical list */
.step .num { position:absolute; left:0; top:0; width:40px; height:40px; border-radius:999px;
  background:var(--brand); color:#fff; font:700 18px var(--font-head); display:grid; place-items:center; }
.step h4 { font-size:16px; font-weight:600; margin-bottom:6px; }
.step p  { font-size:14px; color:var(--text-muted); line-height:1.6; }
/* Desktop: 3-col grid; connector = 2px line var(--border) between nums at top:20px */
```

### 3.3 StatItem (Trust Strip)
```css
.trust-band { background:var(--bg-soft); padding:40px 0; }
.trust-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }   /* mobile: 2×2 */
.stat .value { font:800 32px/1.1 var(--font-head); color:var(--brand-dark); }  /* mobile 26px */
.stat .label { font-size:13px; color:var(--text-muted); margin-top:6px; font-weight:500; }
/* Desktop dividers: border-left 1px var(--border) on items 2-4, padding-left 24px */
```
Numbers are STATIC. No count-up animation.

### 3.4 ReviewCard
```css
.review-card { padding:24px; border-radius:16px; background:#fff;
  border:1px solid var(--border-soft); box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:12px; }
.review-card .stars { display:flex; gap:2px; color:var(--accent); }            /* Lucide Star 16px filled */
.review-card blockquote { font-size:15px; color:var(--text-primary); line-height:1.6; margin:0; }
.review-card .who { font-size:14px; font-weight:600; color:var(--text-primary); }
.review-card .area { font-size:13px; color:var(--text-muted); }
.review-card .ctx { font-size:12px; color:var(--text-muted); }
/* Badge "Verified patient" = Badge info variant, aligned right of .who row */
```
Grid: 3 cols desktop, 1 col mobile, gap 24px. No carousel, no marquee.

### 3.5 Accordion (FAQ)
```css
.faq-item { border:1px solid var(--border-soft); border-radius:12px; background:#fff; margin-bottom:12px; overflow:hidden; }
.faq-head { width:100%; display:flex; justify-content:space-between; align-items:center;
  padding:18px 20px; background:none; border:none; cursor:pointer;
  font-size:15px; font-weight:600; color:var(--text-primary); text-align:left; }
.faq-head .chev { transition:transform 200ms var(--ease); color:var(--text-muted); }
.faq-item.open .chev { transform:rotate(180deg); }
.faq-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows 240ms var(--ease); }
.faq-item.open .faq-body { grid-template-rows:1fr; }
.faq-body > div { overflow:hidden; }
.faq-body p { padding:0 20px 18px; font-size:14px; color:var(--text-muted); line-height:1.65; margin:0; }
```
Container max-width 760px centered. ONE item open at a time.

### 3.6 SegmentedControl (Chat model switch)
```css
.segmented { display:inline-flex; background:var(--bg-soft); border-radius:999px; padding:4px; gap:4px; }
.segmented button { padding:8px 16px; border-radius:999px; border:none; background:transparent;
  font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer; transition:all 180ms var(--ease); }
.segmented button.active { background:#fff; color:var(--brand-dark); box-shadow:var(--shadow-sm); }
.segmented button:disabled { opacity:.55; cursor:not-allowed; }   /* Pro locked for Free plan, shows Lock icon 14px */
```

### 3.7 CtaBand (Final CTA)
```css
.cta-band { background:linear-gradient(120deg, var(--hero-from), var(--hero-to)); padding:64px 0; text-align:center; }
.cta-band h2 { font:700 28px/1.25 var(--font-head); color:#fff; }        /* desktop 36px */
.cta-band .btn { margin-top:24px; background:#fff; color:var(--brand-dark); }  /* inverted primary, 52px */
.cta-band .micro { margin-top:12px; font-size:13px; color:rgba(255,255,255,.75); }
```

### 3.8 SafeImage (unchanged from v1 decision)
Fallbacks: initials avatar (team/doctors), Pill icon on bg-soft (medicines), text logo (brand).

---

## 4. Layout Shell (Unchanged, restated briefly)
- Navbar: 72→64px on scroll, sticky, blur(12px) — only blurred surface. Links 15px muted; active brand + 2px underline. Right: Nearby ghost (36px) + Profile/Register.
- MobileBottomNav: 5 items, SOS always red, 64px + safe-area, z-40.
- Footer: hero-from bg, 4 cols, disclaimer band, copyright.

---

## 5. LANDING PAGE — 8 Sections, Exact Layouts

### S1 HERO
- Bg: linear-gradient(180deg,#F0FAF6,#FFFFFF) + dot pattern fade.
- Grid 55/45 desktop; stacked mobile. Padding 96/48.
- Left: badge pill → H1 → sub (1 sentence, max 520px) → Primary CTA "Chat with Dr MediLink" (L) → TextLink "See how it works ↓".
- Right: ONE static preview card: max-width 420px, radius 20px, shadow-lg, white.
  - Header 48px: avatar 28px brand circle + "Dr MediLink" 14px 600 + green dot "Online" 12px muted.
  - Body padding 20px: user bubble (brand, right, 14px), AI bubble (white bordered, left, 14px), disclaimer line 11px muted.
  - NON-INTERACTIVE. No links, no buttons, no hover lift.
- Stagger: badge 0 / H1 80 / sub 160 / CTA+link 240 / preview 400ms.
- Buttons: **1**.

### S2 SERVICES
- H2 + subtitle centered-left. Grid 3 cols (1 col mobile), gap 24.
- Cards: Pharmacy (Pill icon), Find Doctor (Stethoscope), Emergency SOS (Siren, emergency variant).
- Each card = `<a>` to route. Content: icon, h3, 1-line p, arrow.
- Buttons: **0**.

### S3 HOW IT WORKS
- H2 centered. Desktop 3-col grid with connector line; mobile vertical steps.
- Steps: 1 Ask or browse · 2 Get your plan of action · 3 Confirm on WhatsApp (texts from Master PRD v2 §6.1).
- Buttons: **0**.

### S4 TRUST STRIP
- trust-band with 4 StatItems: 24/7 · 999 · 100% · ৳0 (labels per Master PRD v2).
- Buttons: **0**. No count-up.

### S5 REVIEWS
- H2 "What Patients Say" + summary row: 5 stars (4 filled + 1 half via opacity) + "4.8 / 5" 20px 700 + "from 759 patient reviews across listed doctors" 14px muted.
- 3 ReviewCards (data from doctors.json reviews; ratings 5/5/4; "Verified patient" badge; ctx line "Patient of Dr. …").
- Buttons: **0**.

### S6 FAQ
- H2 centered. Accordion (6 items, Content Sheet v2 patch). First item open by default.
- Buttons: **0**.

### S7 PLANS
- Bg-soft section. 2 cards centered max-width 880px, gap 24. Premium: scale 1.03, 2px brand border, shadow-lg, badge "Best Value".
- Each card: name, price ৳0 / ৳500 + "/month", feature list (check icons 16px brand), ONE button (Start Free → /register · Get Premium → WhatsApp).
- Note banner below (brand-light, 14px).
- Buttons: **2** (1 per card).

### S8 FINAL CTA BAND
- CtaBand: h2 "Your health, one link away." + inverted primary "Create Free Profile" → /register + micro "No password. No email. Takes 30 seconds."
- Buttons: **1**.

**Scroll reveal:** each section header + card group rises once via IntersectionObserver; inner stagger 60ms. Never re-trigger.

---

## 6. REGISTER PAGE (tighter v1)
- Card 520px, padding 32px (mobile 24px), radius 24px, shadow-lg, bg white on page bg-soft.
- Field gap 16px; step gap 24px; chips gap 8px wrap.
- Buttons per step: Back (Ghost, hidden on step 1) + Next/Complete (Primary). Skip = TextLink centered below.
- Success: check circle 56px success-soft, title, sub, auto-redirect 1.2s.

## 7. CHAT PAGE (calmer)
- Header 64px: avatar+name+online · right: New Chat icon, History icon (2 icon controls max).
- Disclaimer banner sticky under header (accent-soft).
- Model switch: SegmentedControl in sidebar top (desktop) / under header (mobile). Pro shows Lock for Free plan.
- Messages: bubbles per v1 (user brand right / AI white left), timestamps 11px, typing dots.
- Input bar sticky: auto-resize textarea + ONE send button 44×44.
- Sidebar 320px: Profile card (rows + "Edit profile" TextLink) · Usage meter (6px bar) · Upgrade button (1, accent-soft) · Emergency card (Call 999 button (1) + "Nearby hospitals" TextLink).
- History list inside History icon → Drawer (not permanent sidebar clutter).

## 8. PHARMACY PAGE
- Search 56px + chips row + sort select (right, 40px).
- Grid 4/2/2 gap 24. MedicineCard v2: image 160px (SafeImage), Rx badge overlay top-left, name 15px 600 clamp-2, generic 12px muted, price row (price 18px 700 + old price strike if discount), ONE Add button S full-width (→ "✓ Added" success state 1.2s).
- Cart: drawer 400px / bottom sheet; rows with qty stepper 32px; totals; ONE WhatsApp button L.
- Mobile sticky summary bar (tap → open cart): count + total + chevron. Not a button cluster.
- Checkout modal: fields + preview box + ONE Send button + Cancel TextLink.

## 9. DOCTOR FINDER PAGE
- Search row + Nearby toggle (ghost → active brand-light state) + specialty chips.
- DoctorRow v2: padding 20px 24px, radius 16px, grid [56px avatar | info | right col].
  - Info: name 16px 700, specialty+exp 13px muted, area+distance 13px muted.
  - Right col: rating (star 14px accent + 4.8 + (124)) · "from ৳300" 15px 700 · Book button S primary.
  - Whole row tappable → drawer; chevron 18px muted at far right.
  - Mobile: 2 lines; right col becomes bottom row (fee + Book).
- Drawer 520px / sheet: sections About/Education/Fees/Availability/Reviews; sticky footer with exactly 2 buttons: Book via WhatsApp (Primary) + Request Video Call (Secondary).
- Empty state per v1.

## 10. EMERGENCY PAGE — unchanged from v1 spec (correct as-is).

## 11. ABOUT / CONTACT — unchanged structure; team cards use SafeImage; contact cards use native links, zero buttons.

---

## 12. Animation Spec (v1 + additions)
- riseIn 600ms cubic-bezier(0.22,1,0.36,1), stagger per §5/S1 and scroll reveal 60ms.
- sosPulse 2.4s infinite — SOS button ONLY.
- Accordion expand 240ms; chevron rotate 200ms; segmented slide 180ms; hover lifts ≤2px @180ms.
- prefers-reduced-motion kills all (v1 media query).
- FORBIDDEN: count-ups, marquees, carousels, typewriter, parallax, cursor effects, auto-play.

## 13. Anti-Slop Rules (v1 list + v2 additions)
All v1 rules remain (no gradient text, no blobs, no glassmorphism beyond navbar, no emoji icons, no lorem, no fake 5-star spam, no heavy shadows, radius tokens only, no typewriter, no carousels, no parallax).
**Added:**
- ❌ No card or row with more than ONE visible button (drawer/modal exceptions frozen in §2.1).
- ❌ No input fields inside marketing sections.
- ❌ No animated stat counters.
- ❌ No review carousels or auto-rotation.
- ❌ No more than ONE open FAQ item.
- ❌ No extra landing sections beyond the 8.

## 14. Accessibility & UX (unchanged from v1)
44px targets · WCAG AA contrast · focus-visible outlines · labels + alt + aria · Escape closes modals · reduced motion · 16px inputs · empty/error/loading states everywhere · SOS never gated · WhatsApp preview before send.

## 15. Visual QA Checklist (per Gate G2–G6)
- [ ] Landing shows exactly 8 sections in order; primary button count = 4
- [ ] Service cards contain no buttons/inputs; hover lifts + arrow slides
- [ ] Trust numbers static; dividers visible desktop only
- [ ] Reviews show mixed stars (5/5/4) + verified badges + doctor context
- [ ] FAQ: one open at a time; smooth 240ms expand
- [ ] Doctor rows: one Book button; drawer has exactly 2 actions
- [ ] Medicine cards: one Add button; success state reverts after 1.2s
- [ ] Chat: segmented control switches; Pro locked icon for Free plan
- [ ] Mobile 375px: bottom nav + sticky cart bar do not overlap; SOS red
- [ ] No console errors; no layout shift on image load

---
*End of UI/UX Specification v2. Feed after Master PRD v2 at Gate G0–G2. Next document when requested: Content Sheet v2 Patch (review texts, FAQ answers, trust labels, CTA copy).*

---
---

# SUPPLEMENTARY DETAIL — Added Sections (v2.1 Addendum)

*The sections below are additive only. Nothing above this line has been altered. These sections fill in implementation-level detail referenced but not fully specified above (e.g. the UI primitives listed in PRD Gate G0, empty/error/loading states referenced in §14/§15, WhatsApp templates referenced throughout, and data shapes referenced in PRD §8).*

---

## 16. Core UI Primitives (Gate G0 Deliverables)

These are the foundational components every other component in §3 is built from. They must exist before any page work begins (PRD §9, Gate G0).

### 16.1 Button
```css
.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px;
  border-radius:12px; font-weight:600; border:none; cursor:pointer;
  transition:transform 160ms var(--ease), box-shadow 160ms var(--ease), background 160ms var(--ease); }
.btn:active { transform:scale(0.98); }
.btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.btn:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }

/* Sizes */
.btn-l { height:52px; padding:0 28px; font-size:16px; border-radius:14px; }
.btn-m { height:44px; padding:0 22px; font-size:15px; }
.btn-s { height:40px; padding:0 16px; font-size:14px; }
.btn-icon { width:44px; height:44px; padding:0; border-radius:12px; }

/* Variants */
.btn-primary { background:var(--brand); color:#fff; box-shadow:var(--shadow-sm); }
.btn-primary:hover { background:var(--brand-dark); box-shadow:var(--shadow-md); }
.btn-secondary { background:#fff; color:var(--brand); border:1.5px solid var(--brand); }
.btn-secondary:hover { background:var(--brand-light); }
.btn-ghost { background:transparent; color:var(--text-muted); }
.btn-ghost:hover { background:var(--bg-soft); color:var(--text-primary); }
.btn-emergency { background:var(--emergency); color:#fff; }
.btn-emergency:hover { background:#B42318; }
.btn-whatsapp { background:var(--whatsapp); color:#fff; }
.btn-whatsapp:hover { background:#1DA851; }
```
Loading state: replace label with 16px spinner (same color as label), disable pointer events, keep width fixed (no layout shift).

### 16.2 Input
```css
.input-field { height:48px; padding:0 14px; border-radius:12px; border:1.5px solid var(--border);
  background:#fff; font-size:16px; color:var(--text-primary); width:100%;
  transition:border-color 160ms, box-shadow 160ms; }
.input-field::placeholder { color:var(--text-muted); }
.input-field:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-light); }
.input-field.error { border-color:var(--emergency); }
.input-field.error:focus { box-shadow:0 0 0 3px var(--emergency-soft); }
.input-label { font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block; }
.input-help { font-size:12px; color:var(--text-muted); margin-top:4px; }
.input-error-text { font-size:12px; color:var(--emergency); margin-top:4px; display:flex; align-items:center; gap:4px; }
```
16px font-size is mandatory (prevents iOS auto-zoom on focus).

### 16.3 Card (base, non-navigating)
```css
.card { background:#fff; border:1px solid var(--border-soft); border-radius:16px;
  padding:24px; box-shadow:var(--shadow-sm); }
.card-flat { border-radius:12px; box-shadow:none; }   /* used inside drawers/modals */
```

### 16.4 Chip
```css
.chip { display:inline-flex; align-items:center; height:36px; padding:0 14px; border-radius:999px;
  border:1.5px solid var(--border); background:#fff; font-size:13px; font-weight:600;
  color:var(--text-muted); cursor:pointer; transition:all 160ms var(--ease); }
.chip:hover { border-color:var(--brand-soft); }
.chip.active { background:var(--brand); border-color:var(--brand); color:#fff; }
.chip.removable { padding-right:8px; gap:6px; }   /* x icon 14px, used in registration allergy chips */
```

### 16.5 Badge
```css
.badge { display:inline-flex; align-items:center; height:22px; padding:0 10px; border-radius:999px;
  font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; }
.badge-info { background:var(--brand-light); color:var(--brand-dark); }
.badge-warn { background:var(--accent-soft); color:#92620A; }       /* Rx required */
.badge-danger { background:var(--emergency-soft); color:#B42318; }  /* out of stock */
.badge-success { background:var(--success-soft); color:#0F7A38; }   /* verified, in stock */
```

### 16.6 Skeleton
```css
.skeleton { background:linear-gradient(90deg, var(--bg-soft) 25%, #F5F9FC 37%, var(--bg-soft) 63%);
  background-size:400% 100%; animation:skeleton-shimmer 1.4s ease infinite; border-radius:8px; }
@keyframes skeleton-shimmer { 0%{background-position:100% 50%} 100%{background-position:0 50%} }
```
Used for: medicine grid (on data fetch), doctor list, chat message pending state (never for the whole page — always shaped to match the final content's dimensions).

### 16.7 Modal
```css
.modal-overlay { position:fixed; inset:0; background:rgba(26,43,76,.45); backdrop-filter:blur(2px);
  display:grid; place-items:center; padding:16px; z-index:50; animation:fadeIn 200ms var(--ease); }
.modal { background:#fff; border-radius:20px; max-width:480px; width:100%; max-height:88vh;
  overflow-y:auto; box-shadow:var(--shadow-lg); animation:modalRise 220ms var(--ease); }
.modal-header { padding:20px 24px; border-bottom:1px solid var(--border-soft);
  display:flex; justify-content:space-between; align-items:center; }
.modal-body { padding:24px; }
.modal-footer { padding:16px 24px; border-top:1px solid var(--border-soft); display:flex; justify-content:flex-end; gap:12px; }
@keyframes modalRise { from{opacity:0; transform:translateY(12px) scale(.98)} to{opacity:1; transform:none} }
```
Escape key + overlay click both close (unless a destructive confirm is pending unsaved input — then require explicit Cancel tap).

### 16.8 Drawer
```css
.drawer { position:fixed; top:0; right:0; height:100%; width:min(520px, 100vw); background:#fff;
  box-shadow:var(--shadow-lg); z-index:50; animation:drawerSlide 240ms var(--ease); overflow-y:auto; }
@keyframes drawerSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }
/* Mobile: bottom sheet instead */
@media (max-width:639px) {
  .drawer { top:auto; bottom:0; right:0; width:100%; height:auto; max-height:85vh;
    border-radius:24px 24px 0 0; animation:sheetSlide 240ms var(--ease); }
  @keyframes sheetSlide { from{transform:translateY(100%)} to{transform:translateY(0)} }
}
```
Sticky footer inside drawer for action buttons (per §2.1 frozen inventories — e.g. doctor drawer's 2 actions).

### 16.9 Toast
```css
.toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); min-width:280px; max-width:90vw;
  background:var(--text-primary); color:#fff; padding:14px 18px; border-radius:12px;
  display:flex; align-items:center; gap:10px; font-size:14px; box-shadow:var(--shadow-lg);
  animation:toastRise 220ms var(--ease); z-index:60; }
.toast.success { background:var(--success); }
.toast.error { background:var(--emergency); }
@keyframes toastRise { from{opacity:0; transform:translate(-50%,12px)} to{opacity:1; transform:translate(-50%,0)} }
```
Auto-dismiss 3.2s, pause timer on hover/touch. Mobile: anchored above bottom nav (bottom:80px).

---

## 17. Empty / Error / Loading States (referenced in §14 checklist, detailed here)

| Context | Loading | Empty | Error |
|---|---|---|---|
| Medicine grid | 8 Skeleton cards, grid layout preserved | Illustration + "No medicines match your search" + Reset chips TextLink | Toast error + inline "Couldn't load medicines" card with Retry TextLink |
| Doctor list | 4 Skeleton rows | "No doctors found nearby" + "Expand search area" TextLink | Same pattern as medicine grid |
| Chat message | Typing-dot bubble (3 dots, 1.2s stagger loop) | N/A (empty chat shows a single centered AI greeting bubble, not a blank screen) | Inline error bubble: "Couldn't reach Dr MediLink — Retry" (TextLink, resends same prompt) |
| Cart | N/A | Empty cart illustration + "Your cart is empty" + "Browse Pharmacy" TextLink | N/A (cart is local state, cannot fail to load) |
| Register submit | Button enters loading state (§16.1), fields disabled | N/A | Inline input-error-text under offending field; do not clear other fields |
| History drawer (chat) | 5 Skeleton rows | "No past conversations yet" centered | Toast + Retry TextLink |
| Nearby hospitals (Emergency) | 3 Skeleton rows | Falls back to static full 5-hospital list (never blank — safety-critical) | Same fallback: never show an error state on the Emergency page |

Rules: skeletons always match the shape/count of the real content they replace (no full-page spinners except first app load, which uses the SafeImage-style logo mark, max 800ms before content or skeleton takes over).

---

## 18. WhatsApp Message Templates (Content Sheet references made concrete)

Variables in `{braces}` are filled from localStorage profile / cart / booking state at send time. All messages open via `wa.me/<number>?text=<url-encoded>`.

**§12.2 — Doctor booking (from row/drawer "Book via WhatsApp"):**
```
Hi MediLink, I'd like to book an appointment.
Doctor: {doctor.name} ({doctor.specialty})
Preferred time: {selected availability or "Any time"}
Patient: {profile.name or "Guest"}, {profile.area or "area not set"}
```

**§12.3 — Video call request (drawer "Request Video Call"):**
```
Hi MediLink, I'd like to request a video consultation.
Doctor: {doctor.name}
Patient: {profile.name or "Guest"}, contact: {profile.phone or "will share on chat"}
```

**§12.4 — Premium upgrade request (Plans card / chat sidebar upsell):**
```
Hi MediLink, I'd like to activate MediLink Premium (৳500/month).
Name: {profile.name or "Guest"}
```

**Pharmacy checkout ("Send via WhatsApp"):**
```
Hi MediLink, I'd like to place an order:
{for each cart item: "- {qty} x {name} (৳{price})"}
Subtotal: ৳{subtotal} | Discount: {premium ? "-20%" : "—"} | Delivery: ৳30
Total: ৳{total}
Deliver to: {name}, {phone}, {address}
```

All four templates are stored as pure functions in `lib/whatsapp.ts` (PRD Gate G1) and unit-testable independent of UI.

---

## 19. Icon Library Reference (Lucide, per component)

| Component / Context | Icon | Size | Color token |
|---|---|---|---|
| ServiceCard — Pharmacy | `Pill` | 22px | var(--brand) |
| ServiceCard — Find Doctor | `Stethoscope` | 22px | var(--brand) |
| ServiceCard — Emergency | `Siren` | 22px | var(--emergency) |
| ServiceCard arrow | `ArrowRight` | 16px | var(--text-muted) → var(--brand) on hover |
| ReviewCard stars | `Star` (filled) | 16px | var(--accent) |
| Doctor row rating | `Star` (filled) | 14px | var(--accent) |
| Doctor row chevron | `ChevronRight` | 18px | var(--text-muted) |
| FAQ chevron | `ChevronDown` | 18px | var(--text-muted) |
| Chat new-chat icon | `Plus` (or `MessageSquarePlus`) | 20px | var(--text-primary) |
| Chat history icon | `History` | 20px | var(--text-primary) |
| Medicine Rx badge | `FileWarning` | 12px | inherits badge-warn text |
| Medicine fallback image | `Pill` | 32px | var(--text-muted), on bg-soft |
| SegmentedControl lock | `Lock` | 14px | var(--text-muted) |
| Emergency SOS button | `Siren` or `PhoneCall` | 32px (button is 96px+) | #fff |
| Toast success | `CheckCircle2` | 18px | #fff |
| Toast error | `AlertCircle` | 18px | #fff |
| Register step check | `Check` | 24px (in 56px circle) | var(--success) |
| Cart stepper +/- | `Plus` / `Minus` | 16px | var(--text-primary) |

Icons are always imported individually (`import { Pill } from 'lucide-react'`) — never the full icon set — to keep bundle size within the phased-delivery budget.

---

## 20. Register Page — Field-Level Validation Rules

| Step | Field | Rule | Error copy |
|---|---|---|---|
| 1 | Name | Required, 2–60 chars | "Please enter your name" |
| 1 | Phone | Required, Bangladeshi format (`01[3-9]\d{8}`) | "Enter a valid phone number (e.g. 017XXXXXXXX)" |
| 1 | Area | Required, select or free text | "Please select or enter your area" |
| 2 | Diseases | Optional, chip multi-select + "Other" free text | — |
| 2 | Allergies | Optional, chip multi-select + "Other" free text | — |
| 3 | Blood group | Optional, select from 8 standard groups | — |
| 3 | Age | Optional, numeric, 0–120 | "Enter a valid age" |
| 3 | Gender | Optional, select | — |
| 3 | Emergency contact | Optional, same phone format as Step 1 | "Enter a valid phone number" |
| 3 | Consent checkbox | Required to complete (not required to skip) | "Please confirm you agree to store your data locally" |

Validation runs on blur (not on every keystroke) and again on submit; the Next/Complete button (§16.1 loading state) stays enabled but shows inline errors rather than disabling silently, so users always understand why they can't proceed.

---

## 21. Data Schema Reference (shapes only — content lives in Content Sheet v2)

```ts
// medicines.json (10 items)
interface Medicine {
  id: string; name: string; genericName: string; category: string;
  description: string; price: number; requiresRx: boolean;
  inStock: boolean; image?: string;
}

// doctors.json (6 items, includes embedded reviews used by ReviewCard §3.4)
interface Doctor {
  id: string; name: string; specialty: string; experienceYears: number;
  area: string; distanceKm?: number; feeFrom: number; rating: number; reviewCount: number;
  bio: string; education: string[];
  fees: { type: string; amount: number }[];
  availability: { day: string; slots: string[] }[];
  reviews: { rating: number; quote: string; reviewerName: string; reviewerArea: string; verified: boolean }[];
  photo?: string;
}

// hospitals.json (5 items)
interface Hospital {
  id: string; name: string; area: string; phone: string;
  latitude: number; longitude: number; distanceKm?: number;
}

// localStorage: medilink_profile
interface Profile {
  name: string; phone: string; area: string;
  diseases: string[]; allergies: string[];
  bloodGroup?: string; age?: number; gender?: string; emergencyContact?: string;
  consentGiven: boolean; registeredAt: string; // ISO date
}

// localStorage: medilink_subscription
interface Subscription { plan: 'free' | 'premium'; activatedAt?: string; }

// localStorage: medilink_cart
interface CartItem { medicineId: string; quantity: number; }

// localStorage: medilink_orders / medilink_chat_history — array logs, newest first, capped per §5.2/§5.1 history limits
```

These shapes back both the Free/Premium gating logic (PRD §3) and the personalized-chat context injection (PRD §5.1) — the AI system prompt reads `Profile` fields directly.

---

*End of Supplementary Detail Addendum. Sections 0–15 above remain the authoritative, unmodified UI/UX Specification v2. Sections 16–21 are implementation-detail additions only.*
