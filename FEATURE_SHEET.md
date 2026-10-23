# MediLink AI — Feature Sheet

**Bangladesh-first AI healthcare platform** · Bangla · English · Banglish

> One-page demo summary. 🆕 = new or upgraded in the latest build.

## At a Glance

**10 pages** · **4 APIs** · **3 free chat models** · **3 languages** · **2 chat modes** · **6 doctors** · **12 medicines** · **5 hospitals** · **115 tests**

## New vs Old

| Area | Core / Older | 🆕 New / Upgraded |
|---|---|---|
| **AI chat** | Multilingual chat, history, streaming, voice input, read-aloud | 3-model dynamic routing, Flash/Pro, fallback + cooldown, live model badge |
| **Safety** | Disclaimer and emergency advice | Tiered triage, serious/emergency zero-drug-name rule, prompt-injection guard, output sanity gates |
| **Documents** | No patient document upload | Prescription/report photo OCR, patient confirmation, IndexedDB storage, retry/manual fallback |
| **Doctor handover** | None | Editable summary, red flags, specialty match, WhatsApp booking, Premium PDF |
| **Medications** | None | Dose parsing, schedules, taken/skip/pause, browser + service-worker reminders |
| **Pharmacy** | Catalogue, cart, checkout | Rx-only gate, OCR prescription match, simulated payment, WhatsApp order, 20% Premium discount |
| **Emergency** | 999 and hospital list | GPS/manual area, road-time matrix + fallbacks, SMS/WhatsApp location share |
| **Premium** | None | ৳500/mo · ৳4,800/yr; bKash/Nagad/card demo checkout; receipt, renewal, persistent Pro unlock |
| **Design** | Standard landing page | Realistic 3D DNA, seamless hero gradient, GSAP motion, responsive mobile navigation |
| **Platform** | Older Next.js stack | Next.js 16.4.2 + React 19.3.1 + Turbopack, 115 tests, SEO/JSON-LD |

## Core Features

### 1. Dr. MediLink — AI Doctor
- Bangla, English and Banglish; natural physician tone with proactive follow-up questions.
- Flash = fast, concise answers; Pro = detailed, structured answers (Premium).
- Streaming, stop-generation, Markdown tables, copy, read-aloud, voice input.
- Persistent local chat history, auto titles, new chat, delete, mobile history drawer.
- Free plan: 2 chats/day; Premium: unlimited. Header shows the routed language/model.

### 2. Medical Safety
- Emergency, serious, mental-health, minor and general case detection.
- Emergency red flags → clear 999 guidance.
- Minor cases may name specific medicines; serious/complex cases do not.
- Patient documents are treated as quoted data — prompt-injection attempts cannot change the system task.
- Handover summary never invents a diagnosis or a dose.

### 3. Prescriptions & Reports
- Upload/camera image of a prescription, test report or photo.
- OCR extracts doctor, clinic, date, medicines, dose, frequency, tests and reference ranges.
- Low-confidence warnings; patient must confirm before the document is used in chat.
- Images are compressed, EXIF-stripped and stored locally in IndexedDB.

### 4. Doctor Handover & PDF
- “Summarize for Doctor” creates an editable handover after 2+ patient messages.
- Includes symptoms, duration, severity, red flags, medications, allergies, conditions and suggested specialty.
- Matching doctors and a WhatsApp booking preview; summary can be attached to the booking.
- Premium PDF export opens the browser print dialog and preserves Bangla text.

### 5. Medication Reminders
- `/medications` page with next dose, today timeline and all schedules.
- One-tap Taken, Skip, Pause, Resume and Delete.
- Schedule editor: medicine, dose, times/day, duration, start date and notes.
- In-app toast, browser notification and service-worker notification; permission requested on a user gesture.
- Active reminder count appears in the chat sidebar.

### 6. Pharmacy
- 12 demo medicines across 6 categories; search, filter and price sorting.
- Stock-aware cart, ৳30 delivery, quantity controls and mobile sticky cart bar.
- bKash, Nagad, card and Cash on Delivery; simulated 1.7s success.
- Prescription-only items require an uploaded prescription; OCR pre-check and pharmacist-review status.
- Order success screen with Order ID, transaction ID and WhatsApp handoff.

### 7. Doctors
- 6 demo doctor profiles across 6 specialties; search and specialty filters.
- “Nearby” uses browser geolocation with profile-area/Dhaka fallback.
- Profile drawer: bio, education, experience, rating, reviews, fees and availability.
- WhatsApp booking, video-call request, optional chat summary and 20% Premium fee discount.

### 8. Emergency
- Large 999 SOS button plus ambulance, SMS and WhatsApp actions.
- GPS with clear permission/error handling and manual area selection.
- 5 hospitals sorted by road time or straight-line distance.
- Google Routes API batch call → Directions API → Haversine fallback; 15-minute cache.
- Hospital cards show 24/7 status, departments, facilities, ICU, trauma centre and beds.

### 9. Premium
- Monthly ৳500; yearly ৳4,800 (save ৳1,200).
- bKash, Nagad and card; prefilled demo credentials; always-successful simulated payment.
- Receipt with subscription ID, transaction ID, activation date and renewal date.
- Active subscription dashboard with renew/change-plan option.
- Working benefits: unlimited chat, Pro mode, 20% pharmacy discount, 20% doctor-fee discount, Premium PDF.

### 10. Design & Platform
- Realistic 32-base-pair 3D DNA with A–T/C–G colours and hover details.
- Full-width seamless hero gradient — no vertical divider or visible canvas seam.
- GSAP hero animation, 3D tilt cards, particle canvas, count-up stats, review marquee and FAQ accordion.
- Responsive navbar, mobile bottom navigation and iOS safe-area support.
- Next.js 16.4.2, React 19.3.1, TypeScript, Tailwind, Zustand, Three.js and GSAP.
- SEO metadata, Open Graph, Twitter cards, sitemap, robots and JSON-LD.

## Demo Boundaries

- **No real account system:** profile is stored locally; no password/OTP or server database.
- **No encryption at rest:** localStorage/IndexedDB store demo data as plain JSON.
- **No real payments:** Premium and pharmacy checkout are simulated; entitlement is client-side.
- **Static demo data:** 6 doctors, 12 medicines and 5 hospitals; no real inventory, scheduling or delivery.
- **WhatsApp handoff:** doctor booking, video request, pharmacy order and emergency alerts open WhatsApp/SMS.
- **No true closed-tab push:** service worker notifications help while the app is open or backgrounded.
- **API keys required:** chat, OCR and road-time matrix depend on OpenRouter/Google Maps credentials; fallbacks exist.
- **AI is assistive:** not a diagnosis or a substitute for a doctor. In an emergency, call 999.
