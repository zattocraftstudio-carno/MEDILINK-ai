export interface FAQItemData {
  q: string;
  a: string;
  steps: string[];
}

/**
 * The FAQ content lives in its own module so that both the interactive
 * accordion (a client component) and the server-rendered `FAQPage`
 * JSON-LD can read it. Keeping one copy means the structured data can
 * never drift from what the page actually shows.
 */
export const FAQ_ITEMS: FAQItemData[] = [
  {
    q: "How does MediLink AI work?",
    a: "Getting started is simple. Create your free MediLink AI account to unlock the full platform experience — including your personal health dashboard, AI-powered consultations with Dr. MediLink, doctor discovery, and pharmacy ordering. Registration takes under two minutes and gives you instant access to all features.",
    steps: ["Step 1 — Create Account", "Step 2 — Complete Profile", "Step 3 — Start Using"],
  },
  {
    q: "How does the Dr. MediLink AI Health Advisor work?",
    a: "Dr. MediLink is MediLink AI's intelligent health assistant, powered by advanced neural networks. After registering, simply open the Dr. MediLink chat interface and describe your symptoms or health concern. Dr. MediLink will analyze your input in real time, provide medically-informed guidance, suggest relevant specialists, and recommend next steps — available 24 hours a day, 7 days a week.",
    steps: ["Register", "Open Chat", "Ask Anything"],
  },
  {
    q: "How do I book an appointment with a doctor?",
    a: "Booking a specialist has never been easier. Navigate to the Doctors section from your dashboard, browse our network of fully verified medical specialists, and select the doctor that matches your needs. From their profile page, tap the Book via WhatsApp button — you will be connected directly to the doctor's scheduling assistant on WhatsApp to confirm your preferred time and date instantly.",
    steps: ["Go to Doctors", "Select Specialist", "Book via WhatsApp"],
  },
  {
    q: "How do I order medicines through the pharmacy?",
    a: "Ordering your prescribed medicines is straightforward. Visit the Pharmacy section, search for your required medicines, and add them to your cart. When you are ready, proceed to Checkout — choose your delivery address, confirm your order, and your medicines will be dispatched promptly. Prescription upload is also supported for controlled medications.",
    steps: ["Go to Pharmacy", "Add to Cart", "Checkout"],
  },
];
