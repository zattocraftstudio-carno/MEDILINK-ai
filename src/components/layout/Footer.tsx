"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { useLanguageStore } from "@/stores/useLanguageStore";

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/emergency") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  const platformLinks = [
    { href: "/", label: t.footer.home },
    { href: "/doctors", label: t.footer.findDoctor },
    { href: "/chat", label: t.footer.aiAdvisor },
    { href: "/pharmacy", label: t.footer.pharmacy },
    { href: "/subscription", label: t.footer.premium },
  ];

  const companyLinks = [
    { href: "/about", label: t.footer.aboutUs },
    { href: "/about#team-section", label: t.footer.meetTeam },
    { href: "/contact", label: t.footer.contactUs },
  ];

  return (
    <footer className="w-full overflow-hidden bg-bg-main">
      {/* Main 4-Column Directory */}
      <div className="border-t border-brand/10 py-16 px-[6%] max-lg:py-12">
        <div className="max-w-[1400px] mx-auto grid grid-cols-[2fr_1fr_1fr_1.3fr] max-lg:grid-cols-2 max-sm:grid-cols-1 gap-12 max-lg:gap-10">
          {/* Col 1: Brand & Social */}
          <div>
            <Link href="/" className="group inline-flex items-center gap-3 mb-3 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center shrink-0">
                <span className="font-heading font-extrabold text-white text-base">M</span>
              </div>
              <div className="font-heading font-extrabold text-[22px] text-text-primary tracking-tight transition-colors duration-300 group-hover:text-brand">
                Medi<span className="text-brand">link</span> AI
              </div>
            </Link>
            <p className="font-sans font-normal text-[14px] text-text-muted leading-relaxed mb-6">
              {t.footer.tagline}
            </p>
            <div className="flex gap-3" aria-label="Social media links">
              <a
                href="https://www.facebook.com/profile.php?id=61587520773135"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all duration-300 hover:scale-115 hover:shadow-[0_4px_16px_rgba(23,120,111,0.35)]"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/sylhetroboticsclub"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all duration-300 hover:scale-115 hover:shadow-[0_4px_16px_rgba(23,120,111,0.35)]"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div>
            <h3 className="font-heading font-bold text-[13px] tracking-[0.08em] uppercase text-text-primary mb-5">
              {t.footer.platform}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Platform navigation">
              {platformLinks.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="group flex items-center gap-1.5 font-sans text-[15px] text-text-muted hover:text-brand transition-all duration-300 hover:translate-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 3: Company Links */}
          <div>
            <h3 className="font-heading font-bold text-[13px] tracking-[0.08em] uppercase text-text-primary mb-5">
              {t.footer.company}
            </h3>
            <nav className="flex flex-col gap-3" aria-label="Company navigation">
              {companyLinks.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="group flex items-center gap-1.5 font-sans text-[15px] text-text-muted hover:text-brand transition-all duration-300 hover:translate-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 4: Get in Touch */}
          <div>
            <h3 className="font-heading font-bold text-[13px] tracking-[0.08em] uppercase text-text-primary mb-5">
              {t.footer.getInTouch}
            </h3>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://wa.me/8801811389672"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 -mx-2 px-2.5 py-1.5 rounded-xl font-sans text-[15px] text-whatsapp font-medium hover:bg-whatsapp/10 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-whatsapp/10 group-hover:bg-whatsapp text-whatsapp group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <span>+880 1811-389672</span>
              </a>
              <a
                href="mailto:medilink123@gmail.com"
                className="group flex items-center gap-2.5 -mx-2 px-2.5 py-1.5 rounded-xl font-sans text-[15px] text-text-muted hover:text-brand hover:bg-brand/10 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-brand/10 group-hover:bg-brand text-brand group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <span className="truncate">medilink123@gmail.com</span>
              </a>
              <a
                href="tel:999"
                className="group flex items-center gap-2.5 -mx-2 px-2.5 py-1.5 rounded-xl font-sans text-[15px] text-emergency font-bold hover:bg-emergency/10 hover:text-emergency-dark transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emergency/10 group-hover:bg-emergency text-emergency group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <span>{t.footer.emergencyNum}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Language Switcher Section — Exclusively in Footer */}
      <div className="border-t border-brand/10 py-5 px-[6%] bg-brand-light/20">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-brand" />
            <span className="font-sans text-[13.5px] font-semibold text-text-primary">
              {t.footer.languageLabel}
            </span>
            <span className="text-xs text-text-muted">
              (Change whole website language)
            </span>
          </div>

          <div
            role="group"
            aria-label="Website language selection"
            className="inline-flex p-1 bg-white rounded-full border border-border-soft shadow-xs"
          >
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={mounted && language === "en"}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 cursor-pointer ${
                mounted && language === "en"
                  ? "bg-brand text-white shadow-xs scale-102"
                  : "text-text-muted hover:text-brand hover:bg-bg-soft"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage("bn")}
              aria-pressed={mounted && language === "bn"}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 cursor-pointer font-bengali ${
                mounted && language === "bn"
                  ? "bg-brand text-white shadow-xs scale-102"
                  : "text-text-muted hover:text-brand hover:bg-bg-soft"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-brand/10 py-5 px-[6%] bg-bg-main">
        <div className="max-w-[1400px] mx-auto text-center">
          <p className="font-sans font-normal text-[13px] text-text-muted hover:text-text-primary transition-colors duration-300 cursor-default">
            {t.footer.disclaimer}
          </p>
        </div>
      </div>

      {/* Watermark */}
      <div className="bg-bg-main w-full overflow-hidden pt-5 pb-0 select-none">
        <div className="giant-text-watermark cursor-pointer" aria-hidden="true">
          MEDILINK AI
        </div>
      </div>
    </footer>
  );
};

export default Footer;
