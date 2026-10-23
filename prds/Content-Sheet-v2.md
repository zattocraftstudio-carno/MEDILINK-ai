# Content Sheet & Copywriting Document — Version 2.0 (MERGED)
**Project Name:** MediLink
**Version:** 2.0 — Full merge of Content Sheet v1 + v2 Patch (single source of truth)
**Language:** English only
**Rule for the AI agent:** Use this text EXACTLY. Do not rewrite, paraphrase, or invent copy. Icons come from Lucide-React — never paste emoji into UI labels.

---

## 1. Global Brand Content

### 1.1 Brand Identity
* **Brand Name:** MediLink
* **Tagline:** "Your Health, One Link Away"
* **Short Description:** "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services."

### 1.2 Global Disclaimer (Footer band + Chat banner)
> "⚠️ MediLink AI is not a substitute for a licensed medical professional. It provides general health guidance only. In case of emergency, call 999 immediately."
*(The ⚠️ is rendered as a Lucide AlertTriangle icon, not an emoji character.)*

### 1.3 Navigation Labels (LOW-ITEM NAVBAR — frozen)
| Element | Label | Target |
|---|---|---|
| Logo (click = home) | MediLink | / |
| Link 1 | Pharmacy | /pharmacy |
| Link 2 | Doctors | /doctors |
| Link 3 | About | /about |
| Icon (red) | SOS (aria-label "Emergency") | /emergency |
| Button | Profile / Get Premium | profile menu or /register |

*No "Home", "Plans", or "Contact" links in navbar. Plans = landing section + footer. Contact = footer only.*

**Mobile bottom nav (5 items):** Home (/) · Dr MediLink (/chat) · Pharmacy (/pharmacy) · Doctors (/doctors) · SOS (/emergency, red)

---

## 2. Landing Page Content (8 sections, exact order)

### 2.1 Section 1 — Hero
* **Badge:** "Built for Bangladesh"
* **Headline (H1):** "Your Health, One Link Away."
* **Subheadline:** "AI health guidance, medicine delivery, doctor bookings, and emergency SOS — all in one trusted platform."
* **Primary CTA:** "Chat with Dr MediLink" → /chat
* **Text link:** "See how it works ↓" → scrolls to Section 3
* **Right preview card (static, non-interactive):**
  * Header: "Dr MediLink" + status "Online"
  * User bubble: "I have a fever and sore throat."
  * AI bubble: "Rest and plenty of fluids help most fevers. If breathing becomes difficult, call 999 immediately."
  * Footer line: "AI guidance only — not a doctor."

### 2.2 Section 2 — Services
* **Title:** "Our Services"
* **Subtitle:** "Tap any service to get started."
* **Card 1:** Title "Pharmacy" — "Order medicines from home. Confirmed on WhatsApp." → /pharmacy
* **Card 2:** Title "Find Doctor" — "Browse specialists near you and book in one tap." → /doctors
* **Card 3 (emergency tint):** Title "Emergency SOS" — "Free for everyone. One tap to 999 and nearby hospitals." → /emergency
*(Cards are links. Zero buttons, zero inputs inside.)*

### 2.3 Section 3 — How It Works
* **Title:** "How MediLink Works"
* **Subtitle:** "Three simple steps from question to care."
* **Step 1:** "Ask or browse" — "Chat with Dr MediLink, or browse our pharmacy and doctor listings."
* **Step 2:** "Get your plan of action" — "Receive general guidance, build a medicine cart, or shortlist the right specialist."
* **Step 3:** "Confirm on WhatsApp" — "Real humans confirm your order or booking on WhatsApp. SOS is always free, anytime."

### 2.4 Section 4 — Trust Strip (static numbers, no count-up)
| Value | Label |
|---|---|
| 24/7 | AI health guidance |
| 999 | National emergency integrated |
| 100% | Orders confirmed on WhatsApp |
| ৳0 | SOS free for everyone |

### 2.5 Section 5 — Reviews
* **Title:** "What Patients Say"
* **Rating summary:** "4.8 / 5 from 759 patient reviews across listed doctors"
* **Review 1:** ★★★★★ — "Very thorough and explained everything clearly. The WhatsApp booking took less than a minute." — Rahat Hossain, Mirpur, Dhaka — badge "Verified patient" — context "Patient of Dr. Karim Ahmed"
* **Review 2:** ★★★★★ — "Great with children and very patient. She answered questions we did not know we had." — Nusrat Fatema, Dhanmondi, Dhaka — badge "Verified patient" — context "Patient of Dr. Salma Begum"
* **Review 3:** ★★★★☆ — "Good advice, and honest about what I did not need to buy. Reply took a little while." — Karim Uddin, Gulshan, Dhaka — badge "Verified patient" — context "Patient of Dr. Rafiq Islam"

### 2.6 Section 6 — FAQ (accordion, first open, one at a time)
1. **Is MediLink free to use?** — "Yes. Browsing, the emergency SOS, and basic AI chats are free forever. The optional Premium plan (৳500/month) adds unlimited AI, 20% discounts, and priority booking."
2. **Is Dr MediLink a real doctor?** — "No. Dr MediLink is an AI assistant that provides general health guidance. It never diagnoses and never prescribes. For a real diagnosis, book a listed doctor through the Doctor Finder."
3. **How does medicine ordering work?** — "Add medicines to your cart, review the WhatsApp message preview, and send it. Our pharmacy partner confirms availability, price, and delivery time on WhatsApp. No online payment is needed."
4. **What happens when I press the SOS button?** — "You get three instant options: call 999, open an SMS with your live location pre-filled, or share your location on WhatsApp. We also show the nearest hospitals with call and directions buttons. No registration is needed."
5. **What do I get with Premium (৳500/month)?** — "Unlimited AI chats within fair use, both Med-1 Flash and Med-1 Pro modes, 20% off pharmacy orders and doctor fees, ultra-high priority booking, full chat and order history, and PDF export."
6. **Is my health data stored on your servers?** — "No. Your profile, chats, cart, and orders are stored only in your browser, on your device. Chat messages are sent to the AI service to generate a reply and are not stored on MediLink servers."

### 2.7 Section 7 — Plans
* **Title:** "Choose Your Plan"
* **Subtitle:** "Get more AI guidance, discounts, and priority bookings."
* **Free card:** Name "Free" · Price "৳0" + "/month" · Description "Perfect for getting started." · Features: "2 AI chats per day", "60 AI requests per month", "Basic medicine search", "Doctor listings", "Emergency SOS", "WhatsApp ordering" · Button "Start Free" → /register
* **Premium card (elevated, badge "Best Value"):** Name "MediLink Premium" · Price "৳500" + "/month" · Description "Complete personalized healthcare." · Features: "Unlimited AI access (fair use)", "Med-1 Pro detailed answers", "Med-1 Flash quick answers", "Full smart search & suggestions", "20% pharmacy discount", "20% doctor fee discount", "Ultra-high priority booking", "Full chat history & PDF export" · Button "Get Premium" → WhatsApp template §12.4
* **Note banner:** "Emergency SOS and basic services are always free for everyone — no registration required."

### 2.8 Section 8 — Final CTA Band
* **Heading:** "Your health, one link away."
* **Button:** "Create Free Profile" → /register
* **Microcopy:** "No password. No email. Takes 30 seconds."

---

## 3. Registration Page Content (unchanged from v1)

* **Title:** "Tell Us About Yourself"
* **Subtitle:** "Dr MediLink and our doctors can give you better advice with this information."
* **Step labels:** "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"
* **Step 1 title:** "Basic Information" — Fields: "Your Full Name" (placeholder "e.g., Rahim Ahmed"), "Mobile Number" (placeholder "01XXXXXXXXX", prefix "+880"), "Your Area" (select: Dhaka, Mirpur, Gulshan, Banani, Uttara, Chattogram, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Mymensingh, Other)
* **Step 2 title:** "Health Profile" — "Do you have any ongoing conditions?" chips: None, Diabetes, High Blood Pressure, Asthma, Heart Disease, Thyroid, Kidney Disease, Arthritis · "Any known allergies?" chips: None, Penicillin, Sulfa Drugs, Seafood, Peanuts, Dust, Pollen + custom input "Or type another allergy..."
* **Step 3 title:** "Optional Details" — "Blood Group (Optional)": A+, A-, B+, B-, O+, O-, AB+, AB-, Don't Know · "Age Group (Optional)": Under 18, 18-30, 31-45, 46-60, 60+ · "Gender (Optional)": Male, Female, Prefer not to say · "Emergency Contact (Optional)": name + phone
* **Consent:** "I understand that MediLink AI is not a doctor and I should call 999 in emergencies."
* **Buttons/links:** "← Back" (ghost) · "Next →" / "Complete Registration" (primary) · "Skip for now" (text link)
* **Success:** "Welcome, {Name}!" · "Your profile has been saved. You can now explore MediLink." · Button "Go to Home"

---

## 4. Chatbot Page Content (Dr MediLink)

* **Header:** "Dr MediLink" · status "● Online" · icon controls: "New Chat", "History"
* **Disclaimer banner:** "Dr MediLink is an AI assistant, not a doctor. It provides general guidance only. For emergencies, call 999."
* **Model switcher (segmented):** "Med-1 Flash" · "Med-1 Pro" (lock icon when Free plan) · Helper: "Flash = quick answers · Pro = detailed guidance" · Locked text: "Premium feature"
* **Input placeholder:** "Type your health question..."
* **Typing indicator:** "Dr MediLink is typing..."
* **Suggested prompts — Guest:** "I have a fever and sore throat" · "Which doctor should I see for chest pain?" · "Home remedies for headache"
* **Suggested prompts — Asthma profile:** "What should I do if I have breathing difficulty?" · "Find a pulmonologist near me" · "Asthma care tips"
* **Suggested prompts — Diabetes profile:** "Diet tips for diabetes" · "My blood sugar is high, what to do?" · "Find an endocrinologist"
* **Sidebar labels:** "Your Profile" (with text link "Edit profile") · "Today's Usage" (format "{used} / {limit}", plan label "Free Plan"/"Premium Plan", button "Upgrade to Premium") · "Emergency" (button "Call 999", text link "Nearby hospitals")
* **History drawer:** title "Chat History" · empty title "No conversations yet" · empty text "Start a new chat and it will appear here."
* **Chat actions:** "Delete" · "Download PDF" · "Clear All History"
* **Delete modal:** "Delete Conversation?" · "This will permanently remove this chat from your history." · "Delete" · "Cancel"
* **Limit reached:** "⭐ Daily Limit Reached" (Star = Lucide icon) · "You've used your free AI chats for today. Upgrade to Premium for unlimited access, or come back tomorrow." · Buttons: "Upgrade to Premium (৳500)" · "Maybe Tomorrow"

---

## 5. Pharmacy Page Content

* **Title:** "Pharmacy" · **Subtitle:** "Order medicines from home. Confirmation via WhatsApp."
* **Search placeholder:** "Search medicine or symptom..." · **Filter (mobile):** "Filters" · **Sort:** "Sort by:" — Popular, Price: Low to High, Price: High to Low
* **Category chips:** All, Fever & Pain, Gastric, Allergy, Vitamins, Skin Care, First Aid, Child Care
* **Card buttons:** "Add" → success "Added ✓" (reverts 1.2s) → disabled "Out of Stock" · Badges: "Rx", "-{percent}%"
* **Cart drawer:** "Your Cart ({count})" · "Subtotal" · "Premium Discount ({percent}%)" · "Delivery Fee" · "Total" · button "Order via WhatsApp"
* **Mobile cart bar:** "{count} items · ৳{total}" + tap label "View Cart"
* **Cart empty:** "Your cart is empty" · "Browse our medicines and add items to your cart." · button "Browse Medicines"
* **Checkout modal:** "Confirm Your Order" · fields Name / Phone / Delivery Address · "WhatsApp Message Preview:" · button "Send via WhatsApp" · link "Cancel"
* **Success:** "Order Request Sent!" · "Our pharmacy partner will confirm your order on WhatsApp." · "Order ID:" · button "Browse More Medicines"

### 5.1 Medicine Data (10 items — exact)
| id | name | generic | category | price | stock | Rx |
|---|---|---|---|---|---|---|
| med_001 | Paracetamol 500mg | Paracetamol | Fever & Pain | 2.50 | 200 | No |
| med_002 | ORS Saline | Oral Rehydration Saline | First Aid | 15.00 | 150 | No |
| med_003 | Omeprazole 20mg | Omeprazole | Gastric | 5.00 | 100 | No |
| med_004 | Cetirizine 10mg | Cetirizine | Allergy | 3.00 | 120 | No |
| med_005 | Vitamin C 500mg | Ascorbic Acid | Vitamins | 8.00 | 80 | No |
| med_006 | Ibuprofen 400mg | Ibuprofen | Fever & Pain | 4.50 | 90 | No |
| med_007 | Antiseptic Cream | Chlorhexidine | First Aid | 45.00 | 60 | No |
| med_008 | Cough Syrup | Dextromethorphan | Fever & Pain | 65.00 | 75 | No |
| med_009 | Multivitamin Tablet | Multivitamin | Vitamins | 12.00 | 110 | No |
| med_010 | Amoxicillin 500mg | Amoxicillin | Infection | 10.00 | 50 | Yes |

---

## 6. Doctor Finder Page Content

* **Title:** "Find Doctor" · **Subtitle:** "Browse specialists near you and book consultations."
* **Search placeholder:** "Search doctor or specialty..." · **Nearby button:** "Nearby" → active "📍 {Area} ({distance} km)" (MapPin = Lucide icon)
* **Specialty chips:** All, Cardiology, Pediatrics, Dermatology, Gynecology, General Physician, Neurology, ENT, Orthopedics, Gastroenterology
* **Row labels:** rating "⭐ {rating} ({count} reviews)" (Star = Lucide) · distance "{distance} km away" · experience "{years} years experience" · fee "from ৳{feeWhatsapp}" · row button "Book"
* **Drawer sections:** "About" · "Education" · "Consultation Fees" ("WhatsApp Consultation" / "Video Call") · "Availability" · "Patient Reviews ({count})"
* **Drawer buttons (exactly two):** "Book via WhatsApp" (primary) · "Request Video Call" (secondary)
* **Empty state:** "No Doctors Found" · "We couldn't find any doctors matching your search." · "Reset Filters" · "View All Doctors"

### 6.1 Doctor Data (6 items — exact, with bio, education, availability, reviews with area)
**doc_001 — Dr. Karim Ahmed** · Cardiology · 12 yrs · ৳300 WA / ৳500 video · Mirpur, Dhaka · 4.8 (124)
Bio: "Senior consultant specializing in hypertension, chest pain, and heart failure management."
Education: "MBBS — Dhaka Medical College", "FCPS — Cardiology"
Availability: "Sat–Wed · 6:00 PM – 9:00 PM"
Reviews: Rahat Hossain (Mirpur, Dhaka) 5★ "Very thorough and explained everything clearly. The WhatsApp booking took less than a minute." · Sumon Mia (Uttara, Dhaka) 5★ "Listened carefully and adjusted my medication plan."

**doc_002 — Dr. Salma Begum** · Pediatrics · 9 yrs · ৳250 / ৳400 · Dhanmondi, Dhaka · 4.9 (210)
Bio: "Child health specialist focused on fever, nutrition, and newborn care."
Education: "MBBS — Sylhet MAG Osmani Medical College", "DCP — Paediatrics"
Availability: "Sat–Thu · 10:00 AM – 1:00 PM"
Reviews: Nusrat Fatema (Dhanmondi, Dhaka) 5★ "Great with children and very patient. She answered questions we did not know we had." · Farhana Akter (Sylhet Sadar, Sylhet) 4★ "Very good consultation, booking slot was slightly delayed."

**doc_003 — Dr. Rafiq Islam** · Dermatology · 7 yrs · ৳300 / ৳450 · Gulshan, Dhaka · 4.7 (89)
Bio: "Skin, hair, and allergy specialist with a focus on honest, minimal treatment."
Education: "MBBS — Chittagong Medical College", "FCPS — Dermatology"
Availability: "Sun–Thu · 5:00 PM – 8:00 PM"
Reviews: Karim Uddin (Gulshan, Dhaka) 4★ "Good advice, and honest about what I did not need to buy. Reply took a little while." · Mitu Rani (Chattogram) 5★ "My skin problem improved exactly as he described."

**doc_004 — Dr. Nusrat Jahan** · Gynecology · 15 yrs · ৳400 / ৳600 · Uttara, Dhaka · 4.8 (156)
Bio: "Women's health specialist covering pregnancy care and hormonal disorders."
Education: "MBBS — Dhaka Medical College", "MS — Gynecology & Obstetrics"
Availability: "Sat–Wed · 4:00 PM – 7:00 PM"
Reviews: Ayesha Khatun (Uttara, Dhaka) 5★ "Explained my pregnancy care plan clearly and calmly." · Rina Das (Uttara, Dhaka) 4★ "Very knowledgeable. Chamber was busy, but worth the wait."

**doc_005 — Dr. Tanvir Hossain** · General Physician · 6 yrs · ৳200 / ৳350 · Sylhet Sadar, Sylhet · 4.6 (78)
Bio: "Family physician for fever, cough, gastric, and everyday illnesses."
Education: "MBBS — Sylhet MAG Osmani Medical College"
Availability: "Every day · 8:00 AM – 11:00 AM"
Reviews: Jahid Hasan (Sylhet Sadar, Sylhet) 5★ "Quick, friendly, and the medicine worked." · Shoma Ahmed (Sylhet Sadar, Sylhet) 4★ "Simple clear advice. Recommended for common illness."

**doc_006 — Dr. Ayesha Siddiqua** · Neurology · 11 yrs · ৳350 / ৳550 · Chattogram · 4.7 (102)
Bio: "Neurologist for migraine, epilepsy, and stroke follow-up care."
Education: "MBBS — Dhaka Medical College", "MD — Neurology"
Availability: "Mon–Thu · 6:00 PM – 9:00 PM"
Reviews: Mizanur Rahman (Chattogram) 5★ "Careful diagnosis and very clear instructions." · Pola Das (Chattogram) 5★ "My mother's migraine plan finally works."

---

## 7. Emergency Page Content (unchanged from v1)

* **Title:** "Emergency Help" · **Subtitle:** "Your nearby hospitals and 999 emergency services."
* **SOS button:** "999" + "Call Now"
* **Action cards:** "Call 999" — "National emergency hotline" · "Send Location SMS" — "Opens SMS app with your location" · "Share on WhatsApp" — "Send location to emergency contact"
* **Location status:** "Finding your location..." · "✓ Your location: {Area}, {City}" · "⚠️ Location off — Select your area manually"
* **Hospitals:** title "Nearby Hospitals" · buttons "Call" / "Directions" · link "View all on Google Maps"

### 7.1 Hospital Data (5 items — exact)
| id | name | address | phone | lat | lng |
|---|---|---|---|---|---|
| hos_001 | Dhaka Medical College Hospital | Secretariat Road, Dhaka | 02-55165088 | 23.7256 | 90.3987 |
| hos_002 | Square Hospital | 18/F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka | 02-8144400 | 23.7594 | 90.3843 |
| hos_003 | Sylhet MAG Osmani Medical College | Medical College Road, Sylhet | 0821-713667 | 24.8944 | 91.8713 |
| hos_004 | Chattogram Medical College Hospital | K.B. Fazlul Kader Road, Chattogram | 031-630335 | 22.3569 | 91.8332 |
| hos_005 | Rajshahi Medical College Hospital | Medical College Road, Rajshahi | 0721-772150 | 24.3745 | 88.6042 |

---

## 8. About Page Content (unchanged from v1)

* **Title:** "About MediLink" · **Subtitle:** "Simplifying healthcare access for the people of Bangladesh."
* **Mission title:** "Our Mission" — "MediLink was built to bridge the gap between patients and healthcare services in Bangladesh. We believe that quick access to health guidance, medicine delivery, and emergency support can save lives. Our AI assistant provides initial triage, while our WhatsApp-based system ensures that commerce remains simple and trusted."
* **Why title:** "Why We Built MediLink" — "In Bangladesh, many people struggle to find reliable health information, book doctors quickly, or access emergency services in time. MediLink solves this by combining AI guidance, a pharmacy marketplace, doctor listings, and an instant SOS feature — all accessible from a single web platform."
* **Services mini-grid:** "AI Guidance" — "Dr MediLink provides 24/7 health triage." · "Medicine Delivery" — "Order medicines via WhatsApp." · "Emergency SOS" — "Instant access to 999 and nearby hospitals."
* **Team title:** "Our Team" · subtitle "Sylhet Robotics Club"
  * Washik Jahan Yafi — Founder — "Visionary leader driving MediLink's mission to transform healthcare access in Bangladesh."
  * Sadi Mohammad — Web Developer — "Full-stack developer building the Next.js platform and AI integrations."
  * Mohammad Isaba Islam — Lead Designer — "Crafting intuitive, accessible, and beautiful user experiences."
  * Sultan Bin Ashik Miah — Scriptwriter — "Creating clear, empathetic content and medical guidance scripts."
* **Roadmap title:** "Roadmap" — "Q1 2026 - MVP Launch" (completed) · "Q2 2026 - bKash/Nagad Payment Integration" · "Q3 2026 - In-App Video Consultation" · "Q4 2026 - Lab Test Booking"

---

## 9. Contact Page Content (unchanged from v1)

* **Title:** "Get in Touch" · **Subtitle:** "We're here to help. Reach out via phone, email, or social media."
* **Card 1:** "Phone Support" · "+880 1811-389672" · action "Tap to Call" → tel:+8801811389672
* **Card 2:** "Official Email" · "medilink123@gmail.com" · action "Send Email" → mailto:medilink123@gmail.com
* **Card 3:** "Facebook Page" · "Sylhet Robotics Club" · action "Visit Page" → https://www.facebook.com/profile.php?id=61587520773135
* **Card 4:** "Instagram" · "@sylhetroboticsclub" · action "Follow Us" → https://www.instagram.com/sylhetroboticsclub

---

## 10. Footer Content (unchanged from v1)

* **Col 1:** Logo + "MediLink" + tagline "Your Health, One Link Away" + plan badges "Free", "Premium ৳500"
* **Col 2 "Services":** Pharmacy · Find Doctor · Dr MediLink · Emergency SOS
* **Col 3 "Support":** About Us · Contact · Plans
* **Col 4 "Contact":** "+880 1811-389672" · "medilink123@gmail.com" · "Sylhet Robotics Club" · "@sylhetroboticsclub"
* **Disclaimer band:** "MediLink AI is not a doctor. For emergencies, call 999."
* **Copyright:** "© 2026 MediLink · Sylhet Robotics Club · Made in Bangladesh"

---

## 11. Error Messages & Empty States (unchanged from v1)

* **Validation:** "Please enter your name." · "Name must be at least 2 characters." · "Please enter a valid 11-digit mobile number (01XXXXXXXXX)." · "Please select your area." · "Please select at least one option (or 'None')." (×2) · "Please agree to the disclaimer to continue."
* **Pharmacy empty:** "No Medicines Found" · "We couldn't find any medicine matching '{query}'." · "Clear Search"
* **Doctor empty:** see §6
* **Chat empty:** "Start a Conversation" · "Ask Dr MediLink any health question. I'm here to help."
* **AI error:** "Oops! Something went wrong." · "Dr MediLink is temporarily unavailable. Please try again in a few moments." · "Retry"
* **Network error:** "Connection Lost" · "Please check your internet connection and try again." · "Retry"
* **Location denied:** "Location Access Denied" · "Please enable location permissions to find nearby doctors and hospitals, or select your area manually." · "Select Area Manually"
* **Location timeout:** "Location Timeout" · "We couldn't determine your location. Please try again or select your area."

---

## 12. WhatsApp Message Templates (unchanged from v1, emoji-free labels)

### 12.1 Pharmacy Order
```
*MediLink Pharmacy Order*
*Name:* {profile.name}
*Phone:* {profile.phone}
*Address:* {profile.area}
*Items:*
{items as "• name (xQty) = ৳price"}
*Subtotal:* ৳{subtotal}
*Discount ({plan}%):* -৳{discount}
*Delivery:* ৳30
*Total:* ৳{total}
Please confirm availability and delivery time.
```
### 12.2 Doctor Booking (WhatsApp)
```
*MediLink Doctor Booking*
*Patient:* {profile.name}
*Phone:* {profile.phone}
*Doctor:* {doctor.name}
*Specialty:* {doctor.specialty}
*Consultation Type:* WhatsApp Chat
*Fee:* ৳{doctor.feeWhatsapp}
*Preferred Time:* {selectedTime}
*Symptoms:* {symptoms}
*Known Allergies:* {allergies or 'None'}
*Plan:* {plan}
Please confirm my appointment.
```
### 12.3 Doctor Booking (Video Call)
```
*MediLink Video Consultation Request*
*Patient:* {profile.name}
*Phone:* {profile.phone}
*Doctor:* {doctor.name}
*Specialty:* {doctor.specialty}
*Consultation Type:* Video Call
*Fee:* ৳{doctor.feeVideo}
*Preferred Date:* {selectedDate}
*Preferred Time:* {selectedTime}
*Symptoms:* {symptoms}
*Known Allergies:* {allergies or 'None'}
*Plan:* {plan}
Please schedule my video consultation.
```
### 12.4 Premium Subscription Request
```
*MediLink Premium Subscription Request*
*Name:* {profile.name}
*Phone:* {profile.phone}
*Current Plan:* {currentPlan}
*Requested Plan:* Premium (৳500/month)
Please activate my Premium subscription. I will complete the payment as instructed.
```
### 12.5 Emergency SOS Share
```
*MediLink Emergency Alert*
*Name:* {profile.name}
*Phone:* {profile.phone}
*Location:* https://maps.google.com/?q={lat},{lng}
*Known Allergies:* {allergies or 'None'}
*Known Conditions:* {diseases or 'None'}
URGENT: Please send help immediately.
```

---

## 13. Toast Messages (unchanged from v1, icons via Lucide)

* **Success:** "Profile saved successfully!" · "{medicineName} added to cart." · "Order request sent via WhatsApp!" · "Conversation deleted." · "Chat exported as PDF." · "Premium plan activated!"
* **Error:** "Failed to add item. Please try again." · "Could not open WhatsApp. Please check your device." · "Unable to get location." · "Failed to generate PDF."
* **Info:** "You have {remaining} AI chats left today." · "Register to get personalized AI advice." · "Upgrade to Premium for unlimited AI access."

---

## 14. Forbidden Strings (must never appear in UI)

- "Add to Cart" (use "Add")
- "Book WhatsApp" / "Request Video Call" on doctor ROWS (video only in drawer)
- Any search placeholder inside landing service cards
- Any button label longer than 3 words on cards/rows
- Emoji characters as icons (Lucide only)
- "Home", "Plans", "Contact" as navbar links
- Lorem ipsum or invented copy of any kind

---

## 15. Agent Instructions

1. This file is the single source of truth for all visible text and dummy data.
2. Replace nothing, invent nothing. If a string is missing here, ASK before writing it.
3. Render all icons with Lucide-React; never paste emoji glyphs into components.
4. Keep the 8 landing sections in the exact order of §2.
5. After building, grep the UI for every string in §14 — zero matches required.

---
*End of Content Sheet v2 (Merged). Delete Content Sheet v1 and the v2 Patch file — this document replaces both.*
