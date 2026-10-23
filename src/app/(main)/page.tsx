import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { TrustStripSection } from "@/components/landing/TrustStripSection";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { PlansSection } from "@/components/landing/PlansSection";

import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FAQ_ITEMS } from "@/data/faq";

/**
 * The landing page is a SERVER component on purpose.
 *
 * It was `"use client"`, which made it impossible to export route
 * metadata — Next.js rejects `export const metadata` from a client
 * component. Every route in the app therefore shared the root layout's
 * single generic title and description.
 *
 * The sections it renders are still client components; that is fine —
 * a server component can render client components.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://medilink.ai";

export const metadata: Metadata = {
  title: "MediLink — Your Health, One Link Away",
  description:
    "MediLink AI connects Bangladeshi patients with doctors, medicines and emergency care. Ask Dr. MediLink in Bangla or English, find verified specialists and order medicines delivered to your door.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "MediLink — Your Health, One Link Away",
    description:
      "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services.",
  },
};

/** Structured data so search engines can render the FAQ and the org card. */
function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "MediLink AI",
    url: SITE_URL,
    description:
      "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services.",
    areaServed: { "@type": "Country", name: "Bangladesh" },
    medicalSpecialty: ["PrimaryCare", "Emergency"],
    availableLanguage: ["en", "bn"],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MediLink AI",
    url: SITE_URL,
    inLanguage: ["en", "bn"],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}

export default function LandingPage() {
  return (
    // A single <main> landmark lives in the (main) layout — nesting a
    // second one here produced two "main" regions for screen readers.
    <div className="min-h-screen bg-bg-main overflow-x-hidden">
      <StructuredData />
      <HeroSection />
      <ServicesSection />
      <TrustStripSection />
      <ReviewsSection />
      <FAQSection />
      <PlansSection />
      <FinalCTASection />
    </div>
  );
}
