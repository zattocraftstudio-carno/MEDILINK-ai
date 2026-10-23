"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Siren,
  User,
  Sparkles,
  Crown,
  Menu,
  X,
  MessageSquare,
  Pill,
  Stethoscope,
  Info,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { Badge } from "@/components/ui/Badge";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isRegistered = useProfileStore((s) => s.isRegistered());
  const profile = useProfileStore((s) => s.profile);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const { t, language } = useLanguageStore();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    const navArrivalTimer = window.setTimeout(() => {
      document.documentElement.dataset.navArrived = "true";
    }, 1000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(navArrivalTimer);
    };
  }, []);

  // Close mobile menu on route change or ESC key
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/chat", label: t.nav.chat, icon: MessageSquare },
    { href: "/pharmacy", label: t.nav.pharmacy, icon: Pill },
    { href: "/doctors", label: t.nav.doctors, icon: Stethoscope },
    { href: "/about", label: t.nav.about, icon: Info },
  ];

  const isHomePage = pathname === "/";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[50] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "h-16 bg-white/95 backdrop-blur-md border-b border-brand/15 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
            : isHomePage
            ? "h-[74px] sm:h-[76px] bg-white/95 border-b border-transparent shadow-none"
            : "h-[74px] sm:h-[76px] bg-white/95 border-b border-border-soft shadow-xs"
        }`}
      >
        <span aria-hidden className="nav-surface pointer-events-none absolute inset-0" />

        <div className="relative z-10 max-w-[1240px] mx-auto h-full px-3.5 sm:px-6 md:px-8 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            href="/"
            aria-label="MediLink AI Home"
            className="nav-logo nav-enter-left group flex items-center gap-2 font-heading font-extrabold text-[20px] sm:text-[22px] text-text-primary tracking-tight focus-visible:outline-brand rounded-md shrink-0"
          >
            <span className="transition-transform duration-300 group-hover:scale-105 inline-block">
              Medi<span className="text-brand">Link</span> AI
            </span>
          </Link>

          {/* Desktop & Tablet Navigation Links */}
          <nav
            aria-label="Desktop Primary"
            className="hidden md:flex items-center gap-3 lg:gap-6"
          >
            {navLinks.map((link, idx) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ animationDelay: `${(0.15 + idx * 0.07).toFixed(2)}s` }}
                  className={`nav-item nav-enter-up relative py-1 text-[14.5px] lg:text-[15px] font-semibold transition-all duration-300 focus-visible:outline-brand rounded-sm group ${
                    active ? "text-brand" : "text-text-muted hover:text-text-primary"
                  } ${language === "bn" ? "font-bengali text-[15.5px]" : ""}`}
                >
                  <span className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 inline-block">
                    {link.label}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] bg-brand rounded-full transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* SOS Emergency Trigger */}
            <Link
              href="/emergency"
              aria-label={t.nav.emergency}
              title={t.nav.emergency}
              className="group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emergency-soft text-emergency border border-emergency/20 hover:bg-emergency hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_16px_rgba(217,45,32,0.3)] focus-visible:outline-emergency"
            >
              <Siren className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:rotate-12" />
              <span className="absolute inset-0 rounded-full border border-emergency/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
            </Link>

            {/* Desktop Auth & Subscription */}
            <div className="hidden sm:flex items-center gap-2.5 border-l border-brand/15 pl-3 lg:pl-4 justify-end">
              {!mounted ? (
                <Link
                  href="/register"
                  className="text-[13.5px] font-semibold text-brand hover:underline"
                >
                  {t.nav.profile}
                </Link>
              ) : isRegistered ? (
                <Link
                  href="/register"
                  className="group flex items-center gap-2 py-1 px-2.5 rounded-full hover:bg-brand-light/60 transition-all duration-300 text-[13.5px] font-semibold text-text-primary hover:text-brand focus-visible:outline-brand"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-transform duration-300 group-hover:scale-105">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <span className="max-w-[90px] lg:max-w-[120px] truncate">{profile?.name}</span>
                </Link>
              ) : (
                <Link
                  href="/register"
                  className={`relative overflow-hidden px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-brand text-white font-heading font-semibold text-[13px] shadow-[0_2px_8px_rgba(23,120,111,0.25)] hover:bg-brand-dark hover:shadow-[0_4px_16px_rgba(23,120,111,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group ${
                    language === "bn" ? "font-bengali text-[14px]" : ""
                  }`}
                >
                  <span className="relative z-10">{t.nav.register}</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                </Link>
              )}

              {mounted && (
                !isPremium ? (
                  <Link
                    href="/subscription"
                    className={`group relative overflow-hidden px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-accent-soft text-accent border border-accent/30 text-[11.5px] sm:text-[12px] font-bold hover:bg-accent hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_2px_12px_rgba(245,158,11,0.3)] flex items-center gap-1 cursor-pointer ${
                      language === "bn" ? "font-bengali text-[12.5px]" : ""
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12" />
                    <span>{t.nav.getPremium}</span>
                  </Link>
                ) : (
                  <Link
                    href="/subscription"
                    aria-label="Manage Premium subscription"
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <Badge variant="warn">{t.nav.premiumBadge}</Badge>
                  </Link>
                )
              )}
            </div>

            {/* Mobile Menu Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? t.nav.close : t.nav.menu}
              aria-expanded={mobileMenuOpen}
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-text-primary hover:bg-bg-soft active:bg-bg-soft/80 transition-colors focus-visible:outline-brand touch-manipulation cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-text-primary" />
              ) : (
                <Menu className="w-5 h-5 text-text-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-[45] md:hidden"
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
          />

          {/* Menu Card */}
          <div className="absolute top-[74px] left-0 right-0 max-h-[calc(100vh-80px)] overflow-y-auto bg-white border-b border-border-soft shadow-xl px-5 py-6 space-y-5 animate-slideDown">
            {/* User Profile Summary on Mobile */}
            {mounted && isRegistered && (
              <div className="flex items-center gap-3 p-3 bg-brand-light/50 rounded-xl border border-brand/15">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-bold text-[15px] text-text-primary truncate">
                    {profile?.name || "Patient"}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {profile?.area || "Bangladesh"}
                  </div>
                </div>
                {isPremium && (
                  <Badge variant="warn" className="shrink-0">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            )}

            {/* Primary Navigation Links */}
            <nav className="space-y-1.5" aria-label="Mobile Menu Links">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center min-h-[44px] gap-3 px-3 py-2.5 rounded-xl font-medium text-[15px] transition-colors touch-manipulation active:scale-[0.99] ${
                  pathname === "/" ? "bg-brand-light text-brand font-bold" : "text-text-primary hover:bg-bg-soft active:bg-bg-soft"
                } ${language === "bn" ? "font-bengali text-[16px]" : ""}`}
              >
                <span>{t.bottomNav.home}</span>
              </Link>

              {navLinks.map((link) => {
                const active = pathname.startsWith(link.href);
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center min-h-[44px] gap-3 px-3 py-2.5 rounded-xl font-medium text-[15px] transition-colors touch-manipulation active:scale-[0.99] ${
                      active ? "bg-brand-light text-brand font-bold" : "text-text-primary hover:bg-bg-soft active:bg-bg-soft"
                    } ${language === "bn" ? "font-bengali text-[16px]" : ""}`}
                  >
                    <IconComponent className={`w-4 h-4 ${active ? "text-brand" : "text-text-muted"}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/emergency"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between min-h-[44px] px-3 py-2.5 rounded-xl font-bold text-[15px] text-emergency bg-emergency-soft/70 hover:bg-emergency-soft active:bg-emergency-soft transition-colors touch-manipulation active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Siren className="w-4 h-4 text-emergency" />
                  <span className={language === "bn" ? "font-bengali text-[16px]" : ""}>
                    {t.nav.emergency}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emergency text-white font-mono">
                  999
                </span>
              </Link>
            </nav>

            {/* Quick Actions in Mobile Drawer */}
            <div className="pt-4 border-t border-border-soft flex flex-col gap-2.5">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center justify-center py-2.5 px-4 rounded-xl text-center font-heading font-semibold text-[14px] bg-brand text-white shadow-xs hover:bg-brand-dark active:bg-brand-dark transition-colors touch-manipulation active:scale-[0.99]"
              >
                {isRegistered ? t.nav.profile : t.nav.register}
              </Link>

              <Link
                href="/subscription"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl text-center font-semibold text-[13.5px] border border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isPremium ? t.nav.premiumBadge : t.nav.getPremium}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
