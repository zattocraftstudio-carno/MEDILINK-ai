# Comprehensive Audit & Fix Plan for MediLink AI

## Executive Summary

This plan addresses four critical areas identified in the audit:
1. **Language Localization** — Translate all hardcoded English to Bengali using the existing i18n system
2. **Mobile Responsiveness** — Fix HeroSection clipping, ThreeDNAHelix/ParticleCanvas performance, viewport issues
3. **Touch Interactivity** — Fix touch targets (< 44px), replace hover-only GSAP interactions, ensure touch-friendly event handlers
4. **Content Refinement** — HowItWorksSection already removed (dead code per audit)

---

## Current State Analysis

### i18n System Status
- **Exists**: `src/lib/i18n.ts` with `en`/`bn` translations for nav, hero, footer, services, trust, reviews, FAQ, plans, finalCTA, common
- **Used by**: HeroSection, Navbar, Footer, MobileBottomNav, PlansSection (partially)
- **NOT used by**: ServicesSection, TrustStripSection, ReviewsSection, FAQSection, FinalCTASection, chat page, pharmacy page, doctors page, emergency page, register page, subscription page, about page, contact page

### Mobile Responsiveness Issues
| Issue | Location | Impact |
|-------|----------|--------|
| HeroSection `overflow-hidden` + `min-h-[max(640px,88svh)]` clips CTAs on short screens | `HeroSection.tsx:435` | Content cut off on real devices |
| ThreeDNAHelix renders on mobile (hidden via CSS but JS runs) | `ThreeDNAHelix.tsx:128-134, 551` | Performance drain |
| HeroParticleCanvas uses `window.innerWidth` on resize → re-initializes particles | `HeroParticleCanvas.tsx:130-133` | Jank on resize |
| GSAP hover interactions (`mouseenter`/`mouseleave`) don't fire on touch | `HeroSection.tsx:364-405` | Node cards non-interactive on mobile |

### Touch Target Violations (WCAG 2.5.8)
| Component | Current Size | Required | File |
|-----------|-------------|----------|------|
| Button `size="s"` | 40px | 44px | `Button.tsx:29` |
| Chip | 36px | 44px | `Chip.tsx:30` |
| Toast dismiss | 24px | 44px | `Toast.tsx:116` |

---

## Implementation Plan

### Phase 1: Language Localization — Extend i18n Coverage

#### 1.1 Extend Translation Schema (`src/lib/i18n.ts`)
Add missing translation keys for:
- **ServicesSection**: All 5 service cards (AI Doctor, Find Doctor, Pharmacy, Emergency, Health Records) — badge, title, description, features, CTAs, chips, scorecard
- **TrustStripSection**: Stats labels ("Satisfied Patients", "Verified Doctors", "AI Accuracy Rate", "Live AI Support")
- **ReviewsSection**: Section badge, title, subtitle, testimonial quotes (keep names/cities in English per audit guidance)
- **FAQSection**: Section badge, title, subtitle, all FAQ items (q, a, steps)
- **PlansSection**: Section title, subtitle, free/premium plan names, prices, descriptions, features, CTAs, note
- **FinalCTASection**: Section badge, title, subtitle, feature badges, 3 action button titles/subtitles
- **Chat Page**: Header, input placeholder, suggested prompts, limit reached card, sidebar, history drawer
- **Pharmacy Page**: Header, search placeholder, category chips, sort labels, cart drawer, checkout modal, prescription modal
- **Doctors Page**: Header, search placeholder, specialty chips, sort labels, doctor cards, detail drawer
- **Emergency Page**: Header, location banner, SOS button, emergency actions, hospital list
- **Register Page**: All 3 wizard steps labels, placeholders, validation messages
- **Subscription Page**: Plan names, prices, features, payment method labels, form fields, receipt
- **About Page**: Mission, pillars, team bios
- **Contact Page**: Contact cards, social links

#### 1.2 Update Components to Use `useLanguageStore`
For each component with hardcoded English:
1. Import `{ useLanguageStore }` from `@/stores/useLanguageStore`
2. Destructure `{ t, language }` from store
3. Replace all hardcoded strings with `t.<section>.<key>`
4. Add `font-bengali` conditional classes where `language === "bn"`
5. Add `lang="bn"` attribute to Bengali text elements

**Priority Order** (highest impact first):
1. ServicesSection (visible on landing, 5 cards × ~15 strings each)
2. TrustStripSection (4 stats)
3. ReviewsSection (8 testimonials)
4. FAQSection (4 FAQ items × 3 parts)
5. PlansSection (2 plans × ~10 features)
6. FinalCTASection (3 action buttons)
7. Chat page components
8. Pharmacy page
9. Doctors page
10. Emergency page
11. Register page
12. Subscription page
13. About page
14. Contact page

---

### Phase 2: Mobile Responsiveness Fixes

#### 2.1 HeroSection Clipping Fix (`src/components/landing/HeroSection.tsx`)
**Problem**: `min-h-[max(640px,88svh)]` + `overflow-hidden` clips content on short landscape phones
**Solution**: 
- Remove `overflow-hidden` from main container
- Change `min-h-[max(640px,88svh)]` to `min-h-screen` with `flex-grow` on content
- Ensure CTA buttons always visible by using `flex-shrink-0` on CTA row
- Add `pb-safe` (safe-area-inset-bottom) to bottom padding

#### 2.2 ThreeDNAHelix Mobile Optimization (`src/components/landing/ThreeDNAHelix.tsx`)
**Problem**: Component mounts but returns null on mobile — still runs effect cleanup
**Solution**:
- Move `isMobile` check to top of component (before any effects)
- Return `null` immediately if mobile — no effects register
- Or use `dynamic` import with `ssr: false` and `loading` fallback

#### 2.3 HeroParticleCanvas Resize Optimization (`src/components/landing/HeroParticleCanvas.tsx`)
**Problem**: `handleResize` calls `initParticles()` on every resize → jank
**Solution**:
- Debounce resize handler (150ms)
- Only re-initialize if width/height changed significantly (>50px)
- Keep particle positions relative during resize instead of full re-init

#### 2.4 GSAP Touch Interactions (`src/components/landing/HeroSection.tsx`)
**Problem**: `mouseenter`/`mouseleave` don't fire on touch devices
**Solution**:
- Add `touchstart`/`touchend` handlers alongside mouse handlers
- Or use `pointerenter`/`pointerleave` (works for both mouse and touch)
- Ensure `touch-action: none` not set on interactive elements

---

### Phase 3: Touch Target Fixes (WCAG 2.5.8 Compliance)

#### 3.1 Button Component (`src/components/ui/Button.tsx`)
- Change `size="s"` height from `h-10` (40px) to `h-11` (44px)
- Ensure `size="m"` is `h-12` (48px), `size="l"` is `h-14` (56px)

#### 3.2 Chip Component (`src/components/ui/Chip.tsx`)
- Change height from `h-9` (36px) to `h-11` (44px)
- Adjust padding: `px-3` → `px-4`

#### 3.3 Toast Dismiss Button (`src/components/ui/Toast.tsx`)
- Change dismiss button from `p-1.5` (24px) to `p-2.5` (40px) with `min-w-[44px] min-h-[44px]`

#### 3.4 MobileBottomNav Items (`src/components/layout/MobileBottomNav.tsx`)
- Verify touch targets: current `h-16` (64px) container with icons — OK
- Ensure label text not clipped

#### 3.5 HeroSection Node Cards
- Add `pointerenter`/`pointerleave` alongside `mouseenter`/`mouseleave`
- Ensure cards have `touch-action: manipulation`

---

### Phase 4: Verification & Testing

#### 4.1 Automated Checks
```bash
# TypeScript
npm run typecheck

# Unit tests
npm test

# Build verification
npm run build

# Tailwind compile verification (all opacity modifiers present)
npx tailwindcss -i src/app/globals.css -o /tmp/tw.css --content "./src/**/*.{ts,tsx}"
for c in '.bg-brand\/10' '.border-brand\/20' '.bg-emergency\/15' '.text-text-muted\/70' '.bg-brand-light\/60'; do
  echo -n "$c -> "; grep -cF "$c" /tmp/tw.css; done
```

#### 4.2 Manual Device Testing Checklist
- [ ] **iPhone SE (375×667)**: Hero CTAs visible, no clipping
- [ ] **iPhone 14 Pro (393×852)**: Hero animations smooth, ThreeDNAHelix hidden
- [ ] **Galaxy S23 (360×780)**: Touch targets ≥44px, navigation works
- [ ] **iPad Mini (768×1024)**: Desktop nav visible, ThreeDNAHelix renders
- [ ] **Landscape phone (812×375)**: Hero content scrollable, not clipped
- [ ] **Touch interactions**: Node cards respond to tap, navbar menu opens/closes, bottom nav switches pages
- [ ] **Language toggle**: Footer switcher changes entire site to Bengali, `lang="bn"` on HTML
- [ ] **Bangla font**: Hind Siliguri renders on all Bengali text (check `:lang(bn)` CSS)

#### 4.3 Accessibility Verification
```bash
# axe DevTools on key pages
# Pages: /, /chat, /pharmacy, /doctors, /emergency, /register, /subscription
# Target: 0 critical, 0 serious
```

---

## File Modification Summary

### New/Modified Translation Files
- `src/lib/i18n.ts` — Extend `TranslationSchema` and `translations.bn`

### Components to Localize (use `useLanguageStore`)
1. `src/components/landing/ServicesSection.tsx`
2. `src/components/landing/TrustStripSection.tsx`
3. `src/components/landing/ReviewsSection.tsx`
4. `src/components/landing/FAQSection.tsx`
5. `src/components/landing/PlansSection.tsx`
6. `src/components/landing/FinalCTASection.tsx`
7. `src/components/chat/ChatHeader.tsx`
8. `src/components/chat/ChatInput.tsx`
9. `src/components/chat/SuggestedPrompts.tsx`
10. `src/components/chat/LimitReachedCard.tsx`
11. `src/components/chat/ChatSidebar.tsx`
12. `src/components/chat/HistoryDrawer.tsx`
13. `src/components/pharmacy/MedicineCard.tsx`
14. `src/components/pharmacy/CartDrawer.tsx`
15. `src/components/pharmacy/CheckoutModal.tsx`
16. `src/components/pharmacy/OrderSuccessModal.tsx`
17. `src/components/pharmacy/PrescriptionUploadModal.tsx`
18. `src/components/doctors/DoctorRow.tsx`
19. `src/components/doctors/DoctorDetailDrawer.tsx`
20. `src/components/emergency/SOSButton.tsx`
21. `src/components/emergency/EmergencyActions.tsx`
22. `src/components/emergency/HospitalList.tsx`
23. `src/app/(main)/chat/page.tsx`
24. `src/app/(main)/pharmacy/page.tsx`
25. `src/app/(main)/doctors/page.tsx`
26. `src/app/(main)/emergency/page.tsx`
27. `src/app/(main)/register/page.tsx`
28. `src/app/(main)/subscription/page.tsx`
29. `src/app/(main)/about/page.tsx`
30. `src/app/(main)/contact/page.tsx`

### Mobile Responsiveness Fixes
- `src/components/landing/HeroSection.tsx` — Fix clipping, add touch handlers
- `src/components/landing/ThreeDNAHelix.tsx` — Early return on mobile
- `src/components/landing/HeroParticleCanvas.tsx` — Debounce resize

### Touch Target Fixes
- `src/components/ui/Button.tsx` — `size="s"` → `h-11`
- `src/components/ui/Chip.tsx` — `h-9` → `h-11`
- `src/components/ui/Toast.tsx` — Dismiss button → 44×44px

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Translation inconsistencies | Medium | Medium | Use single source of truth (`i18n.ts`), review with native speaker |
| GSAP animation conflicts on touch | Low | Medium | Test `pointerenter`/`pointerleave` thoroughly |
| ThreeDNAHelix memory leak on mobile | Medium | High | Early return pattern, verify cleanup |
| Bundle size increase from translations | Low | Low | Translations are small JSON, tree-shaken |
| Regression in existing Bengali support | Low | High | Run full test suite, verify `lang="bn"` on AI replies |

---

## Success Criteria

1. **Language**: 100% of user-visible text uses `t.<key>` from i18n; Bengali renders in Hind Siliguri; `lang="bn"` on HTML when Bengali selected
2. **Mobile**: Hero CTAs never clipped on any viewport ≥320px; ThreeDNAHelix inactive on mobile; animations 60fps
3. **Touch**: All interactive elements ≥44×44px; node cards respond to tap; navbar/menu works on touch
4. **Build**: `npm run build` passes; `npm run typecheck` passes; `npm test` passes (95 tests)
5. **Accessibility**: axe DevTools 0 critical/serious on all pages

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Localization | 2-3 days | None |
| Phase 2: Mobile Responsiveness | 1 day | Phase 1 (for translated strings in Hero) |
| Phase 3: Touch Targets | 0.5 day | None |
| Phase 4: Verification | 0.5 day | Phases 1-3 complete |

**Total**: ~4-5 days for complete implementation