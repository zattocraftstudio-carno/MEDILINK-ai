# Technical Architecture Specification
**Project Name:** MediLink  
**Version:** 1.0  
**Target AI Agent:** Coding Agent (Cursor, Copilot, Llama, etc.)  
**Strict Constraint:** No backend database (Supabase/Firebase/SQL). Pure client-side persistence + Next.js API proxy for AI.

---

## 1. Technology Stack & Dependencies
The AI coding agent must use the following stack. Do not introduce unnecessary heavy libraries.

* **Framework:** Next.js 14+ (App Router)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS
* **State Management:** Zustand (with `persist` middleware for `localStorage` syncing)
* **Icons:** Lucide-React
* **Fonts:** Montserrat (Headings), Inter (Body), Hind Siliguri (Bengali fallback) via `next/font/google`.
* **PDF Generation:** `jspdf` (Client-side execution to avoid serverless memory limits).
* **Routing/Forms:** Next.js native routing + React Hook Form (for the multi-step registration).

---

## 2. Project Folder Structure
The agent must adhere to this strict directory structure to maintain separation of concerns:

```text
/src
  /app
    /api
      /chat/route.ts       # Proxy for OpenRouter (Gemma 27B)
    /(main)
      /page.tsx            # Landing Page
      /pharmacy/page.tsx   # Pharmacy E-commerce
      /doctors/page.tsx    # Doctor Finder
      /emergency/page.tsx  # SOS 999
      /chat/page.tsx       # Dr MediLink Interface
      /register/page.tsx   # 3-Step Soft Registration
      /about/page.tsx      # Team & Mission
      /contact/page.tsx    # Contact Info
  /components
    /ui                    # Primitives (Button, Input, Card, Chip, Badge)
    /layout                # Navbar, Footer, MobileBottomNav
    /chat                  # ChatBubble, ChatInput, ChatHistorySidebar
    /pharmacy              # MedicineCard, CartDrawer
    /doctors               # DoctorCard, DoctorDetailDrawer
  /data                    # Static JSON databases (Read-only)
    medicines.json
    doctors.json
    hospitals.json
  /lib
    /openrouter.ts         # AI API logic & streaming handler
    /whatsapp.ts           # Message template generators
    /pdf-generator.ts      # jsPDF utility for exporting chats
    /geo.ts                # Haversine formula for distance calculation
  /stores                  # Zustand stores (synced to localStorage)
    useProfileStore.ts
    useSubscriptionStore.ts
    useChatStore.ts
    useCartStore.ts
  /types                   # TypeScript interfaces for all data models
```

---

## 3. Data Persistence (Zustand + LocalStorage)
Since there is no backend database, all user state is managed via Zustand stores with the `persist` middleware. 

### 3.1. `useProfileStore`
Stores the user's soft-registration data.
```typescript
interface Profile {
  isRegistered: boolean;
  name: string;
  phone: string;
  area: string;
  diseases: string[];       // e.g., ["Asthma", "Diabetes"]
  allergies: string[];      // e.g., ["Penicillin"]
  bloodGroup?: string;
  ageGroup?: string;
  gender?: string;
  emergencyContact?: { name: string; phone: string };
  consentGiven: boolean;
}
```

### 3.2. `useSubscriptionStore`
Manages the Free vs Premium (500 BDT) state.
```typescript
interface Subscription {
  plan: 'free' | 'premium';
  activatedAt?: string; // ISO Date string
  // Note: For the demo, Premium is activated manually via a hidden dev button or WhatsApp confirmation simulation.
}
```

### 3.3. `useChatStore`
Manages Dr MediLink conversations.
```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
interface ChatSession {
  id: string; // UUID
  title: string; // Auto-generated from first user prompt
  modelUsed: 'med1-pro' | 'med1-flash';
  messages: Message[];
  createdAt: number;
}
// Store holds an array of ChatSessions and the activeSessionId.
```

### 3.4. `useCartStore`
Manages pharmacy checkout state.
```typescript
interface CartItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
}
```

---

## 4. Static Data Schema (JSON Files)
The agent must import these JSON files directly into the client components.

### 4.1. `medicines.json`
```json
[
  {
    "id": "med_001",
    "name": "Paracetamol 500mg",
    "genericName": "Paracetamol",
    "category": "Fever & Pain",
    "price": 2.50,
    "stock": 150,
    "prescriptionRequired": false,
    "imageUrl": "/assets/medicines/paracetamol.jpg",
    "description": "Used for mild to moderate pain and fever."
  }
]
```

### 4.2. `doctors.json`
```json
[
  {
    "id": "doc_001",
    "name": "Dr. Karim Ahmed",
    "specialty": "Cardiology",
    "experienceYears": 12,
    "feeWhatsapp": 300,
    "feeVideo": 500,
    "whatsappNumber": "8801712345678",
    "area": "Mirpur, Dhaka",
    "latitude": 23.8223,
    "longitude": 90.3643,
    "rating": 4.8,
    "bio": "Senior Consultant with 12 years of experience in cardiovascular diseases.",
    "education": ["MBBS - Dhaka Medical College", "FCPS - Cardiology"],
    "reviews": [
      { "userName": "Rahat", "rating": 5, "comment": "Very thorough and helpful." }
    ]
  }
]
```

---

## 5. AI Integration & Prompt Engineering
The AI Chatbot ("Dr MediLink") relies on a Next.js API Route (`/api/chat`) to securely proxy requests to OpenRouter (Gemma 27B).

### 5.1. Environment Variables
```env
OPENROUTER_API_KEY=sk-or-v1-xxxx...
NEXT_PUBLIC_WHATSAPP_NUMBER=8801811389672
```

### 5.2. System Prompts
The agent must dynamically inject the user's `useProfileStore` data into the system prompt before sending it to OpenRouter.

**Context Injection Block:**
```text
[USER CONTEXT]
Name: {profile.name}
Age: {profile.ageGroup}
Location: {profile.area}
Known Conditions: {profile.diseases.join(', ')}
Allergies: {profile.allergies.join(', ')}
```

**Prompt A: Med-1 Flash (Default - Speed & Conciseness)**
```text
You are Dr MediLink (Flash Mode), a fast, concise AI health assistant for Bangladesh.
RULES:
1. Keep responses under 3-4 sentences. Get straight to the point.
2. NEVER diagnose diseases or prescribe specific medication dosages.
3. If the user mentions severe symptoms (chest pain, breathing difficulty, heavy bleeding), IMMEDIATELY tell them to call 999 or use the SOS button.
4. Acknowledge the user's known conditions/allergies if relevant to their query.
5. End every response with: "Disclaimer: I am an AI. Please consult a real doctor for medical decisions."
```

**Prompt B: Med-1 Pro (Detailed & Empathetic)**
```text
You are Dr MediLink (Pro Mode), an empathetic, detailed AI health assistant for Bangladesh.
RULES:
1. Provide comprehensive, step-by-step guidance, lifestyle tips, and explanations.
2. NEVER diagnose diseases or prescribe specific medication dosages. Recommend using the MediLink Doctor Finder to book a specialist.
3. If the user mentions severe symptoms, strongly advise calling 999 or using the SOS feature immediately.
4. Carefully consider the user's known conditions and allergies, explaining how they might interact with their current symptoms.
5. End every response with: "Disclaimer: I am an AI. This information is for educational purposes. Please consult a licensed doctor via MediLink for a proper diagnosis."
```

### 5.3. Streaming Implementation
The `/api/chat` route MUST use `TransformStream` or standard Web Streams to stream the Gemma 27B response token-by-token to the client UI. Do not wait for the full response before rendering.

---

## 6. WhatsApp Message Templates
The `/lib/whatsapp.ts` utility must generate URL-encoded strings for `https://wa.me/{number}?text={encoded_message}`.

### 6.1. Pharmacy Order Template
```text
🛒 *MediLink Pharmacy Order*
*Name:* {profile.name}
*Phone:* {profile.phone}
*Address:* {profile.area}

*Items:*
{items.map(i => `- ${i.name} (x${i.quantity}) = ${i.price * i.quantity} BDT`).join('\n')}

*Subtotal:* {subtotal} BDT
*Discount (Premium):* -{discount} BDT
*Total:* {total} BDT

Please confirm availability and delivery.
```

### 6.2. Doctor Booking Template (WhatsApp Consult)
```text
👨‍⚕️ *MediLink Doctor Booking (WhatsApp)*
*Patient:* {profile.name}
*Phone:* {profile.phone}
*Doctor:* {doctor.name} ({doctor.specialty})
*Preferred Time:* {selectedTime}
*Symptoms:* {userSymptoms}
*Known Allergies:* {profile.allergies.join(', ')}

Please confirm my consultation slot.
```

---

## 7. Core Utilities & Logic

### 7.1. Geolocation & Haversine Formula (`/lib/geo.ts`)
* The agent must implement the Haversine formula to calculate the distance (in km) between the user's browser GPS coordinates and the `latitude`/`longitude` of dummy hospitals and doctors.
* Fallback: If the user denies GPS permissions, sort by the `area` selected in their profile.

### 7.2. PDF Export (`/lib/pdf-generator.ts`)
* Use `jspdf` to generate a PDF of the active chat session.
* Format: Title (Chat Title), Date, followed by a chronological list of User and Dr MediLink messages.
* Triggered via a "Download PDF" button in the Chat UI.

---

## 8. Strict Implementation Rules for the Agent
1. **No `fetch` to external databases:** All data comes from local JSON imports or Zustand stores.
2. **No Auth Middleware:** Do not create Next.js middleware to protect routes. All routes are public.
3. **Mobile-First CSS:** Write Tailwind classes for mobile first, then use `md:` and `lg:` breakpoints for desktop layouts.
4. **Safe Emergency Links:** Use `<a href="tel:999">` and `<a href="sms:999?body=...">` for the SOS page. Do not attempt to send background SMS via an API.
5. **Asset Paths:** Assume all team photos are in `/public/assets/team/` and logos in `/public/assets/`. Use Next.js `<Image>` component where appropriate.

---
*End of Technical Architecture Spec. The AI Agent should now initialize the Next.js project, install dependencies, and set up the Zustand stores and JSON data files.*
