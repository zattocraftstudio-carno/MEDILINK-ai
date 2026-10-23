# Test Checklist & Demo Script
**Project Name:** MediLink  
**Version:** 1.0  
**Team:** Sylhet Robotics Club  
**Purpose:** Quality assurance checklist and live demo preparation for the national competition.

---

## 1. Pre-Demo Preparation Checklist

Complete ALL items before the demo day. Mark each as ✅ Done.

### 1.1. Environment Setup
- [ ] Next.js app runs without console errors (`npm run dev`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint warnings (critical ones fixed)
- [ ] All images load correctly (logos, team photos, medicine images)
- [ ] Fonts load (Montserrat, Inter, Hind Siliguri)

### 1.2. API & AI Verification
- [ ] `OPENROUTER_API_KEY` is valid and not expired
- [ ] Gemma 27B responds within 5 seconds on average
- [ ] Med-1 Flash returns quick responses (< 3s)
- [ ] Med-1 Pro returns detailed responses (< 8s)
- [ ] Streaming works (tokens appear one by one)
- [ ] Fallback plan ready if API fails (see Section 7)

### 1.3. Data Verification
- [ ] All 10 medicines display correctly
- [ ] All 6 doctors display correctly
- [ ] All 5 hospitals display correctly
- [ ] Dummy reviews show realistic ratings (4.3 - 4.9)
- [ ] Prices display with ৳ symbol

### 1.4. Browser & Device Testing
- [ ] Tested on Chrome (Desktop)
- [ ] Tested on Chrome (Mobile - Android)
- [ ] Tested on Safari (Mobile - iPhone)
- [ ] Tested on Firefox
- [ ] Tested at 375px width (iPhone SE)
- [ ] Tested at 768px width (Tablet)
- [ ] Tested at 1280px width (Desktop)
- [ ] Tested at 1920px width (Full HD)

### 1.5. Network Conditions
- [ ] Tested on fast WiFi
- [ ] Tested on 4G/Mobile data
- [ ] Tested with slow connection (throttled)
- [ ] Tested offline behavior (graceful error messages)

---

## 2. Functional Testing Checklist

### 2.1. Landing Page
**Priority: CRITICAL**
- [ ] Hero section renders with all 5 animated elements
- [ ] "Chat with Dr MediLink" button navigates to `/chat`
- [ ] "Explore Services" button scrolls to services section
- [ ] All 3 service cards display correctly
- [ ] Pharmacy search input in service card works
- [ ] Emergency SOS button in service card triggers action
- [ ] Doctor preview shows 2 dummy doctors
- [ ] Plans section shows Free and Premium cards
- [ ] Premium card has "Best Value" badge
- [ ] Navbar links all work
- [ ] Mobile bottom navigation shows 5 items
- [ ] Footer displays all links and contact info

### 2.2. Registration Flow
**Priority: CRITICAL**
- [ ] Registration form opens from navbar
- [ ] Step 1: Name, Phone, Area fields present
- [ ] Step 1: Phone validation works (11 digits)
- [ ] Step 2: Disease chips multi-select works
- [ ] Step 2: Allergy chips multi-select works
- [ ] Step 2: Custom allergy input works
- [ ] Step 3: Blood group, age, gender optional
- [ ] Step 3: Emergency contact optional
- [ ] Consent checkbox required before submit
- [ ] "Skip for now" link works
- [ ] After submit, redirects to landing page
- [ ] Profile saved in localStorage
- [ ] Navbar shows profile avatar after registration

### 2.3. Dr MediLink Chatbot
**Priority: CRITICAL**
- [ ] Chat page loads without errors
- [ ] Disclaimer banner shows at top
- [ ] Model switcher shows Med-1 Flash (default) and Med-1 Pro
- [ ] User can type and send message
- [ ] AI response streams (token by token)
- [ ] User bubble shows on right (brand color)
- [ ] AI bubble shows on left (white)
- [ ] Timestamp shows below messages
- [ ] Typing indicator shows while AI thinks
- [ ] Suggested prompts appear based on profile
- [ ] Usage counter increments after each message
- [ ] Free plan limit enforced (2/day)
- [ ] Limit reached modal shows upgrade option
- [ ] New Chat button clears current conversation
- [ ] History sidebar shows past conversations
- [ ] Delete conversation works
- [ ] Download PDF generates file
- [ ] PDF contains chat messages
- [ ] Profile context injected (name, diseases, allergies)
- [ ] Emergency keywords trigger SOS warning
- [ ] Mobile: Sidebar accessible via bottom sheet
- [ ] Input field auto-resizes
- [ ] Send button disabled when input empty

### 2.4. Pharmacy
**Priority: CRITICAL**
- [ ] Medicine grid displays all items
- [ ] Medicine images load
- [ ] Rx badge shows on prescription items
- [ ] Search bar filters medicines
- [ ] Category chips filter correctly
- [ ] Add to cart button works
- [ ] Added state shows "✓ Added"
- [ ] Cart drawer opens
- [ ] Cart quantity +/- works
- [ ] Cart remove item works
- [ ] Subtotal calculates correctly
- [ ] Premium discount applies (20%)
- [ ] Free plan shows 0% discount
- [ ] WhatsApp checkout button works
- [ ] Checkout modal shows message preview
- [ ] Guest checkout asks for name/phone/address
- [ ] Registered checkout auto-fills profile
- [ ] WhatsApp opens with pre-filled message
- [ ] Success page shows after checkout
- [ ] Empty cart state displays correctly
- [ ] Mobile: Sticky cart bar shows when items added

### 2.5. Doctor Finder
**Priority: CRITICAL**
- [ ] Doctor list displays all items
- [ ] Doctor avatars load
- [ ] Specialty chips filter correctly
- [ ] Search bar filters doctors
- [ ] Nearby button requests location
- [ ] Location permission granted: shows distance
- [ ] Location permission denied: shows fallback
- [ ] Distance calculation correct (Haversine)
- [ ] Doctor cards show fees (WhatsApp + Video)
- [ ] Rating displays with stars
- [ ] Details drawer opens on click
- [ ] Drawer shows bio, education, fees, reviews
- [ ] WhatsApp booking generates message
- [ ] Video call request generates message
- [ ] Premium discount applies to fees
- [ ] Empty state shows when no results
- [ ] Mobile: Filter accessible via bottom sheet

### 2.6. Emergency Page
**Priority: CRITICAL**
- [ ] Page loads instantly
- [ ] SOS button displays with pulse animation
- [ ] Call 999 button uses `tel:999`
- [ ] SMS draft button uses `sms:999?body=...`
- [ ] Location permission requested
- [ ] Location found: shows area name
- [ ] Location denied: shows manual area select
- [ ] Nearby hospitals list displays
- [ ] Hospital distance calculated
- [ ] Call hospital button works
- [ ] Directions button opens Google Maps
- [ ] WhatsApp share location works
- [ ] Registered user: name/phone auto-filled
- [ ] Guest user: can still use all features
- [ ] No registration prompt on this page

### 2.7. About & Contact Pages
**Priority: IMPORTANT**
- [ ] About page loads
- [ ] Mission text displays
- [ ] Team grid shows 4 members
- [ ] Team photos load from /assets/team/
- [ ] Team names and roles correct
- [ ] Roadmap timeline displays
- [ ] Contact page loads
- [ ] Phone number displays: +880 1811-389672
- [ ] Email displays: medilink123@gmail.com
- [ ] Facebook link works
- [ ] Instagram link works
- [ ] Tap to call works on mobile

### 2.8. Subscription & Plans
**Priority: IMPORTANT**
- [ ] Free plan features display correctly
- [ ] Premium plan features display correctly
- [ ] Premium price shows ৳500/month
- [ ] Upgrade button opens WhatsApp
- [ ] WhatsApp message contains subscription request
- [ ] Demo activation button works (dev mode)
- [ ] After activation, navbar shows Premium badge
- [ ] Premium discount applies to pharmacy
- [ ] Premium discount applies to doctor fees
- [ ] Premium unlocks unlimited AI

---

## 3. UI/UX Testing Checklist

### 3.1. Visual Consistency
- [ ] All buttons use correct variants (Primary/Secondary/Ghost/Emergency)
- [ ] All cards have 16px radius and consistent padding
- [ ] All inputs have 48px height and 16px font size
- [ ] All chips have 38px height and pill shape
- [ ] All headings use Montserrat font
- [ ] All body text uses Inter font
- [ ] Emergency red used ONLY for SOS elements
- [ ] Accent orange used ONLY for discounts/premium
- [ ] No emoji icons (all Lucide icons)
- [ ] No gradient text
- [ ] No blur blobs in backgrounds

### 3.2. Responsive Design
- [ ] Navbar collapses to hamburger on mobile
- [ ] Mobile bottom nav shows on mobile only
- [ ] Hero stacks vertically on mobile
- [ ] Service cards stack on mobile
- [ ] Pharmacy grid: 2 cols on mobile
- [ ] Doctor list: single column on mobile
- [ ] Cart: bottom sheet on mobile
- [ ] Doctor details: bottom sheet on mobile
- [ ] Chat sidebar: bottom sheet on mobile
- [ ] All touch targets >= 44px

### 3.3. Animations
- [ ] Hero elements animate with stagger (0-560ms)
- [ ] Scroll reveal triggers once
- [ ] SOS pulse animation loops smoothly
- [ ] Button hover: translateY(-1px)
- [ ] Card hover: translateY(-2px)
- [ ] No janky animations
- [ ] Reduced motion respected

### 3.4. Empty & Error States
- [ ] Empty cart shows message + browse button
- [ ] No search results shows message + reset button
- [ ] AI error shows retry button
- [ ] Network error shows retry button
- [ ] Location denied shows manual select
- [ ] All empty states have icons

### 3.5. Loading States
- [ ] Skeleton loaders for doctor list
- [ ] Skeleton loaders for medicine grid
- [ ] Chat typing indicator (3 dots)
- [ ] Button loading spinner during actions
- [ ] Page transitions smooth

---

## 4. Accessibility Testing

- [ ] All images have alt text
- [ ] All inputs have labels
- [ ] All buttons have aria-labels
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus states visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces page changes
- [ ] Error messages associated with inputs
- [ ] Modal can be closed with Escape key
- [ ] No content conveyed by color alone

---

## 5. Performance Testing

- [ ] Initial page load < 3 seconds on 4G
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] No layout shifts during image loading
- [ ] Images optimized (WebP, lazy loading)
- [ ] No unnecessary re-renders
- [ ] localStorage operations fast (< 50ms)
- [ ] Chat streaming doesn't block UI

---

## 6. Demo Script (Live Presentation)

**Total Duration:** ~7 minutes  
**Presenter:** Washik Jahan Yafi (Founder) or assigned member  
**Operator:** Sadi Mohammad (Web Developer) - controls the screen

---

### 6.1. Opening (30 seconds)
**Slide/Screen:** Title slide with MediLink logo

**Speaker:**
> "Assalamu Alaikum and good morning, respected judges. We are Team Sylhet Robotics Club, and today we present MediLink — an AI-powered healthcare platform built specifically for Bangladesh.
>
> In Bangladesh, millions struggle to access reliable health information, book doctors quickly, or reach emergency services in time. MediLink solves this by combining AI health guidance, medicine delivery, doctor bookings, and instant emergency SOS — all in one platform, accessible via WhatsApp."

**Action:** Click to live website

---

### 6.2. Landing Page Tour (45 seconds)
**Screen:** Landing page hero section

**Speaker:**
> "This is our landing page. You can see our hero section with two main actions: Chat with Dr MediLink, our AI health assistant, and Explore Services.
>
> Below, we have three interactive service cards: Pharmacy, Emergency SOS, and Doctor Finder. Each card is functional — you can search medicines, call 999, or find nearby doctors directly from here."

**Action:** Scroll down slowly, hover over service cards

---

### 6.3. Emergency SOS Demo (1 minute) ⭐ EMOTIONAL HOOK
**Screen:** Emergency page

**Speaker:**
> "Let me start with our most critical feature: Emergency SOS. In Bangladesh, the national emergency number is 999.
>
> Watch this: One tap, and you can call 999 immediately. The system detects your location and shows nearby hospitals with directions. You can also send an SMS with your live location.
>
> Importantly, this feature is FREE for everyone. No registration needed. In an emergency, there should be zero barriers."

**Action:**
1. Click SOS button → show action sheet
2. Click "Call 999" → show dialer opens
3. Show nearby hospitals list
4. Click "Directions" → show Google Maps

---

### 6.4. Registration & Personalization (1 minute)
**Screen:** Registration page

**Speaker:**
> "Now let's see how MediLink personalizes the experience. We use a soft registration — no passwords, no emails. Just essential health information.
>
> In Step 1, the user enters their name, phone, and area. In Step 2, they select existing conditions and allergies. This data is stored locally on their device.
>
> Let's complete a quick registration."

**Action:**
1. Fill in Step 1: "Rahim Ahmed", "01712345678", "Mirpur, Dhaka"
2. Step 2: Select "Asthma", Select "Penicillin" allergy
3. Step 3: Select Blood Group "O+", Skip others
4. Check consent, Click "Complete Registration"
5. Show redirect to landing page with profile avatar in navbar

**Speaker (continuing):**
> "Now MediLink knows Rahim has asthma and a penicillin allergy. This context will be used by our AI assistant."

---

### 6.5. Dr MediLink AI Chatbot (1.5 minutes) ⭐ KEY FEATURE
**Screen:** Chat page

**Speaker:**
> "This is Dr MediLink, our AI health assistant powered by Google Gemma 27B. It has two modes: Med-1 Flash for quick answers, and Med-1 Pro for detailed guidance.
>
> Notice the profile context on the sidebar. Dr MediLink knows Rahim has asthma and a penicillin allergy.
>
> Let's ask a question."

**Action:**
1. Type: "I have a fever and sore throat. What should I do?"
2. Show streaming response
3. Switch model to Med-1 Pro
4. Type: "I'm also feeling breathless. Is it serious?"
5. Show emergency warning in response
6. Click "Call 999" button in AI response
7. Show usage counter (2/2 for free plan)

**Speaker (continuing):**
> "Watch how the AI handles this. For the fever, it provides general guidance. But when I mention breathlessness — a potential emergency symptom — it immediately advises calling 999 and shows the SOS option.
>
> Also notice: the AI did NOT prescribe specific medicine dosages. It's designed to be safe and responsible.
>
> Users can also download this conversation as a PDF, view history, and start new chats."

**Action:** Click "Download PDF" → show PDF opens

---

### 6.6. Pharmacy & WhatsApp Checkout (1 minute)
**Screen:** Pharmacy page

**Speaker:**
> "Next, our Pharmacy. Users can browse medicines, search by symptom, and add to cart.
>
> Let's order some medicine."

**Action:**
1. Search "fever" → show filtered results
2. Add Paracetamol to cart → show "✓ Added"
3. Add ORS to cart
4. Click cart icon → show drawer
5. Show subtotal and Premium discount (if active)
6. Click "Order via WhatsApp"
7. Show checkout modal with message preview
8. Click Send → show WhatsApp opens with pre-filled message

**Speaker (continuing):**
> "All checkouts happen via WhatsApp. This is intentional — in Bangladesh, WhatsApp is trusted and widely used. Users don't need to enter payment details on a website. The pharmacy confirms the order on WhatsApp.
>
> Premium users get a 20% discount automatically applied."

---

### 6.7. Doctor Finder & Booking (1 minute)
**Screen:** Doctor Finder page

**Speaker:**
> "Our Doctor Finder lets users browse specialists near their location."

**Action:**
1. Click "📍 Nearby" → show location detection
2. Show doctor list with distances
3. Click "Cardiology" specialty chip
4. Click on Dr. Karim Ahmed → show details drawer
5. Show bio, education, fees, reviews
6. Click "Book via WhatsApp" → show booking message

**Speaker (continuing):**
> "Users can book consultations via WhatsApp or request a video call. The booking message includes the patient's symptoms, known allergies, and preferred time.
>
> Premium users get priority booking and discounted fees."

---

### 6.8. Subscription Plans (30 seconds)
**Screen:** Plans section

**Speaker:**
> "MediLink offers two plans. The Free plan includes basic AI access and emergency SOS. The Premium plan, at just 500 taka per month, unlocks unlimited AI, 20% discounts, priority booking, and full smart search.
>
> We've kept pricing affordable for the Bangladeshi market."

**Action:** Show Free vs Premium comparison

---

### 6.9. About & Team (30 seconds)
**Screen:** About page

**Speaker:**
> "MediLink is built by Sylhet Robotics Club — a team of four passionate about using technology to improve healthcare access in Bangladesh.
>
> Our roadmap includes payment integration, in-app video consultation, and lab test booking in the coming quarters."

**Action:** Show team photos and roadmap

---

### 6.10. Closing (30 seconds)
**Screen:** Landing page or title slide

**Speaker:**
> "To summarize: MediLink provides AI health guidance, medicine delivery, doctor bookings, and emergency SOS — all accessible via WhatsApp, all built for Bangladesh.
>
> We believe technology can save lives, and MediLink is our step towards that vision.
>
> Thank you. We're happy to answer your questions."

**Action:** Show team on stage / Q&A slide

---

## 7. Backup Plans & Contingencies

### 7.1. If AI API Fails (OpenRouter Down)
**Symptom:** Chat returns error or timeout.

**Plan A:** Switch to fallback model (pre-configured in code).

**Plan B:** Use pre-recorded demo.
* Have a screen recording of the chatbot working.
* Say: "To save time, let me show you a recorded demo of the AI in action."
* Play video.

**Plan C:** Manual simulation.
* Have pre-typed responses ready.
* Type the question, then paste the prepared answer.
* Say: "Due to network constraints, I'll walk you through the AI's response."

### 7.2. If Internet Fails Completely
**Symptom:** Website won't load, AI won't respond.

**Plan A:** Use local backup.
* Run `npm run build && npm start` on a local server.
* Have a mobile hotspot ready as backup internet.

**Plan B:** Use pre-recorded video.
* Have a full demo video (7 minutes) ready on laptop and USB.
* Play video, narrate live over it.

**Plan C:** Use screenshots/slides.
* Have a slide deck with all key screens.
* Walk through features verbally.

### 7.3. If Location/GPS Fails
**Symptom:** Browser can't get location.

**Plan:** Use manual area selection.
* Say: "For this demo, I'll select the area manually."
* Choose "Mirpur, Dhaka" from dropdown.
* Show hospitals filtered by that area.

### 7.4. If WhatsApp Doesn't Open
**Symptom:** `wa.me` link doesn't trigger.

**Plan:** Show the message preview.
* Say: "The system generates this WhatsApp message. On a real device, it opens WhatsApp automatically."
* Show the modal with message preview.
* Have a screenshot of WhatsApp with the message ready.

### 7.5. If a Bug Appears Live
**Symptom:** Unexpected error, broken layout, console error.

**Plan:** Stay calm, acknowledge, move on.
* Say: "That's a minor UI issue we're aware of. Let me show you the next feature."
* Do NOT spend time debugging live.
* Do NOT apologize excessively.
* Have the next feature ready to show.

### 7.6. If Time Runs Short
**Symptom:** Judges signal time is up.

**Plan:** Skip to Emergency + Closing.
* Emergency SOS is the most impactful feature.
* Say: "Let me quickly show you our most critical feature: Emergency SOS."
* Demo SOS (30 seconds).
* Close with vision statement.

---

## 8. Judge Q&A Preparation

### 8.1. Technical Questions

**Q: Why did you choose localStorage instead of a database like Supabase?**
> A: "For this MVP and competition demo, localStorage provides instant data persistence without server costs or authentication complexity. In production, we plan to migrate to Supabase with proper authentication and encrypted storage for sensitive health data. The architecture is designed to make that migration straightforward."

**Q: How do you handle user privacy and medical data?**
> A: "Currently, all data stays on the user's device via localStorage — nothing is sent to our servers except the AI chat messages, which are processed by OpenRouter's API. In production, we'll implement end-to-end encryption, explicit consent flows, and comply with Bangladesh's data protection guidelines. We never store medical data on our servers without consent."

**Q: Why WhatsApp instead of a proper payment gateway?**
> A: "In Bangladesh, WhatsApp is the most trusted communication channel. Many users are hesitant to enter payment details on websites. WhatsApp checkout reduces friction and builds trust. For production, we plan to integrate bKash, Nagad, and SSLCommerz for seamless payments. The WhatsApp flow remains as an option for users who prefer it."

**Q: How accurate is your AI medical advice?**
> A: "Dr MediLink is NOT a diagnostic tool. It provides general health guidance, triage, and referrals. We've implemented strict guardrails: it never prescribes dosages, never diagnoses, and always recommends seeing a real doctor. For emergency symptoms, it immediately directs users to call 999. The AI is a guide, not a replacement for medical professionals."

**Q: What happens if the AI gives wrong advice?**
> A: "We've minimized this risk through prompt engineering and safety guardrails. The AI is instructed to be conservative, avoid specific medical advice, and always include disclaimers. Additionally, users are encouraged to consult real doctors via our Doctor Finder. In production, we'll add a feedback mechanism and human review for flagged responses."

### 8.2. Business Questions

**Q: How will you make money?**
> A: "Our primary revenue is the Premium subscription at 500 taka/month. This gives unlimited AI access, 20% discounts, and priority booking. We'll also earn commissions from pharmacy orders and doctor bookings. In the future, we plan to offer featured listings for doctors and pharmacies."

**Q: Who is your target market?**
> A: "Our primary target is urban and semi-urban Bangladesh, ages 18-45, who are comfortable with smartphones and WhatsApp. This includes young professionals, parents, and people managing chronic conditions. The emergency SOS feature serves everyone, regardless of age or tech literacy."

**Q: What's your competition?**
> A: "There are telemedicine apps like Praava Health and Shasthya Batayon. However, MediLink differentiates by combining AI triage, pharmacy delivery, doctor booking, AND emergency SOS in one platform, all accessible via WhatsApp. We're not just a telemedicine app — we're a comprehensive health companion."

**Q: How will you acquire users?**
> A: "We'll start with social media marketing (Facebook, Instagram) targeting health-conscious users. We'll partner with local pharmacies and doctors for referrals. The free emergency SOS feature is a powerful acquisition tool — once users experience it, they're likely to explore other features. We'll also run awareness campaigns about AI health literacy."

### 8.3. Design & UX Questions

**Q: Why is the design green and teal?**
> A: "Green and teal represent health, trust, and calm. In medical contexts, these colors reduce anxiety and build confidence. We avoided red except for emergencies, where it signals urgency. The soft blue backgrounds create a clean, professional feel."

**Q: How did you ensure accessibility?**
> A: "We followed WCAG AA guidelines. All text has sufficient contrast (4.5:1). All touch targets are at least 44px. We support keyboard navigation and screen readers. The emergency SOS is accessible without registration. We also respect 'prefers-reduced-motion' for users with vestibular disorders."

**Q: Why mobile-first?**
> A: "Over 80% of internet users in Bangladesh access the web via mobile phones. We designed for mobile first, then enhanced for desktop. The bottom navigation bar, sticky SOS button, and WhatsApp integration are all mobile-optimized."

### 8.4. Team & Process Questions

**Q: How did your team divide the work?**
> A: "Washik Jahan Yafi (Founder) handled product vision, strategy, and the demo script. Sadi Mohammad (Web Developer) built the entire Next.js application and AI integration. Mohammad Isaba Islam (Lead Designer) created the UI/UX design system and components. Sultan Bin Ashik Miah (Scriptwriter) wrote all content, medical guidance scripts, and the presentation."

**Q: What was the biggest challenge?**
> A: "Balancing AI safety with usefulness. We wanted Dr MediLink to be helpful without giving dangerous medical advice. We iterated on the system prompts many times, tested with real scenarios, and implemented strict guardrails. The result is an AI that guides without diagnosing."

**Q: What did you learn?**
> A: "We learned that building for Bangladesh requires understanding local context — WhatsApp trust, emergency 999, affordability, and mobile-first design. We also learned the importance of responsible AI in healthcare. This project taught us that technology must serve people, not the other way around."

### 8.5. Future & Roadmap Questions

**Q: What's next for MediLink?**
> A: "In Q2 2026, we'll integrate bKash and Nagad for seamless payments. In Q3, we'll add in-app video consultation using WebRTC. In Q4, we'll launch lab test booking. Long-term, we want to become Bangladesh's most trusted health companion, reaching 1 million users."

**Q: Will you add more AI features?**
> A: "Yes. We plan to add symptom checker with visual guides, medication reminders, and health report summarization. We're also exploring voice input for users who prefer speaking over typing. All AI features will maintain our strict safety guardrails."

---

## 9. Final Go/No-Go Checklist

**Complete this 2 hours before the demo.**

### 9.1. Technical Readiness
- [ ] Laptop fully charged + charger ready
- [ ] Backup laptop ready (if possible)
- [ ] Mobile hotspot ready (backup internet)
- [ ] All demo accounts logged in
- [ ] Premium plan activated for demo
- [ ] Browser bookmarks set (Landing, Chat, Pharmacy, Doctor, Emergency)
- [ ] Demo video recorded and saved (backup)
- [ ] Slides saved locally (backup)
- [ ] USB drive with all backups

### 9.2. Content Readiness
- [ ] Demo script printed (for speaker)
- [ ] Q&A answers reviewed by all team members
- [ ] Team introduction prepared
- [ ] Closing statement memorized

### 9.3. Team Readiness
- [ ] All 4 team members present
- [ ] Roles assigned (Speaker, Operator, Q&A support)
- [ ] Dress code confirmed (professional)
- [ ] Water bottles ready
- [ ] Confidence check: Everyone knows their part

### 9.4. Venue Check
- [ ] Projector/HDMI works
- [ ] Internet available at venue
- [ ] Sound system works (if needed)
- [ ] Timer visible
- [ ] Backup plan for venue tech failure

---

## 10. Known Limitations (Acknowledge Proactively)

If judges ask about limitations, acknowledge them confidently:

1. **No real payment processing:** "We use WhatsApp for MVP. Payment integration is in our Q2 roadmap."
2. **No backend database:** "localStorage for demo. Supabase migration planned for production."
3. **No real doctor verification:** "Doctors are dummy data for demo. In production, we'll verify with BMDC registration."
4. **AI can't diagnose:** "By design. We prioritize safety over diagnostic capability."
5. **No multi-language support:** "English only for MVP. Bangla support planned for next release."
6. **No push notifications:** "Planned for PWA version in Q3."

---
*End of Test Checklist & Demo Script. The team should run through this checklist at least 3 times before the competition day. Practice the demo script until it feels natural. Prepare for Q&A as a team. Good luck, Sylhet Robotics Club!*
