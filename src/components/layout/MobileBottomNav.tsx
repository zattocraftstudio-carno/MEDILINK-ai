"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Pill, Stethoscope, Siren } from "lucide-react";
import { useLanguageStore } from "@/stores/useLanguageStore";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { t, language } = useLanguageStore();

  const navItems = [
    { href: "/", label: t.bottomNav.home, icon: Home },
    { href: "/chat", label: t.bottomNav.chat, icon: MessageSquare },
    { href: "/pharmacy", label: t.bottomNav.pharmacy, icon: Pill },
    { href: "/doctors", label: t.bottomNav.doctors, icon: Stethoscope },
    { href: "/emergency", label: t.bottomNav.sos, icon: Siren, isEmergency: true },
  ];

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white border-t border-border-soft pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          if (item.isEmergency) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full gap-1 text-emergency hover:bg-emergency-soft active:bg-emergency-soft transition-all touch-manipulation select-none active:scale-[0.97]"
                aria-label="Emergency SOS"
                aria-current={isActive ? "page" : undefined}
              >
                <div className="w-8 h-8 rounded-full bg-emergency-soft flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-emergency" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${language === "bn" ? "font-bengali" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all touch-manipulation select-none active:scale-[0.97] ${
                isActive ? "text-brand" : "text-text-muted hover:text-text-primary active:text-text-primary"
              }`}
            >
              <item.icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"} ${language === "bn" ? "font-bengali text-[12px]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
