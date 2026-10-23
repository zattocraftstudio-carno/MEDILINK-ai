"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import {
  ArrowRight,
  MessageSquare,
  Pill,
  Siren,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/stores/useLanguageStore";

/**
 * `useLayoutEffect` is a no-op on the server and React warns about it. This
 * component is a client component, but Next.js still server-renders it, so the
 * layout effect has to degrade to a plain effect while there is no DOM.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Visible focus ring — the same treatment every other control in the app uses. */
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4";

/**
 * The hero's entrance tempo.
 *
 * `RHYTHM` is the gap between two arrivals: every element takes its cue
 * exactly one beat after the one before it. `STAGGER` is the shorter beat
 * used for the items INSIDE one group — the headline lines, the route
 * stations and their icons — where a cascade reads as craft rather than
 * as delay.
 *
 * Keeping both on one grid is what makes the sequence feel deliberate:
 * re-timing the whole hero is a two-number change, and no two elements
 * can drift apart by accident.
 */
const RHYTHM = 0.16;
const STAGGER = 0.1;

/**
 * The navbar's CSS arrival takes one second (surface → logo → links → actions).
 * The hero waits for it on a first paint so the page reads top-to-bottom:
 * navbar first, then the promise, then the product visual. On a client-side
 * return to the homepage the navbar is already settled, so the hero starts
 * almost immediately instead of making the visitor wait again.
 */
const NAV_ARRIVAL_MS = 1000;

/** Places an arrival on the beat grid. */
const beat = (index: number) => index * RHYTHM;

type HeroNode = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
  /** The emergency node opts out of the brand accent. */
  emergency?: boolean;
};

/**
 * The node order mirrors the care journey: ask → medicate → see a specialist
 * → escalate. The sub-lines are derived from `src/data/*.json` (6 doctors,
 * 12 medicines, 5 hospitals) and have to be kept truthful when the catalogue
 * changes.
 */
const getHeroNodes = (lang: string): HeroNode[] => [
  {
    id: "chat",
    icon: MessageSquare,
    title: lang === "bn" ? "এআই চ্যাট" : "Chat",
    subtitle: lang === "bn" ? "বাংলা ও ইংরেজিতে পরামর্শ" : "Ask in Bangla or English",
    href: "/chat",
  },
  {
    id: "medicines",
    icon: Pill,
    title: lang === "bn" ? "ওষুধ" : "Medicines",
    subtitle: lang === "bn" ? "ক্যাটালগে ১২টি ওষুধ" : "12 in the catalogue",
    href: "/pharmacy",
  },
  {
    id: "doctors",
    icon: Stethoscope,
    title: lang === "bn" ? "ডাক্তার" : "Doctors",
    subtitle: lang === "bn" ? "৬ জন বিশেষজ্ঞ ডাক্তার" : "6 specialists",
    href: "/doctors",
  },
  {
    id: "emergency",
    icon: Siren,
    title: lang === "bn" ? "জরুরি সেবা" : "Emergency",
    subtitle: lang === "bn" ? "৯৯৯ · ৫টি হাসপাতাল" : "999 · 5 hospitals",
    href: "/emergency",
    emergency: true,
  },
];

export const HeroSection: React.FC = () => {
  const rootRef = useRef<HTMLElement | null>(null);
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  const { t, language } = useLanguageStore();
  const heroNodes = getHeroNodes(language);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const h1 = h1Ref.current;
    if (!root || !h1) return;

    let media: gsap.MatchMedia | undefined;
    let context: gsap.Context | undefined;
    const disposers: Array<() => void> = [];

    const query = <T extends Element>(selector: string): T[] =>
      Array.from(root.querySelectorAll<T>(selector));

    context = gsap.context(() => {
      // Registering inside the effect (not at module scope) matters:
      // `SplitText.register()` reads `window.innerWidth`, so registering at
      // module scope would throw during the server render.
      gsap.registerPlugin(DrawSVGPlugin, SplitText, CustomEase);
      if (!CustomEase.get("medilink")) {
        CustomEase.create("medilink", "M0,0 C0.22,1 0.36,1 1,1");
      }

      const badge = query("[data-hero-badge]");
      const subtext = query("[data-hero-subtext]");
      const ctaRow = query("[data-hero-cta]");
      const assurance = query("[data-hero-assurance]");
      const visual = query("[data-hero-visual]");
      const floats = query("[data-hero-float]");
      const nodeCards = query("[data-node-card]");
      const iconChips = query("[data-node-chip]");
      const nodesBand = root.querySelector<HTMLElement>("[data-hero-nodes]");
      const nodesHeading = root.querySelector<HTMLElement>("[data-hero-nodes-heading]");
      const connectorLines = query<SVGLineElement>("[data-connector-line]");
      const travelTrack = root.querySelector<HTMLElement>("[data-travel-track]");
      const travelDot = root.querySelector<HTMLElement>("[data-travel-dot]");

      media = gsap.matchMedia();

      /**
       * Reduced motion: everything is simply visible. No entrance animation,
       * no travelling dot. The only CSS-hidden state is the short-lived
       * `hero-pending` class, which is removed here immediately.
       */
      media.add("(prefers-reduced-motion: reduce)", () => {
        const visible = [
          ...badge,
          ...subtext,
          ...ctaRow,
          ...assurance,
          ...visual,
          ...floats,
          ...nodeCards,
          ...iconChips,
        ];
        gsap.set(visible, { clearProps: "all" });
        gsap.set(visible, { opacity: 1, y: 0, scale: 1 });
        if (nodesBand) gsap.set(nodesBand, { opacity: 1 });
        if (nodesHeading) gsap.set(nodesHeading, { opacity: 1 });
        gsap.set(connectorLines, { drawSVG: "0% 100%" });
        if (travelDot) gsap.set(travelDot, { opacity: 0 });
        document.documentElement.classList.remove("hero-pending");
      });

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const isMobileScreen =
          typeof window !== "undefined" && window.innerWidth < 1024;

        if (isMobileScreen) {
          const visible = [
            ...badge,
            ...subtext,
            ...ctaRow,
            ...assurance,
            ...visual,
            ...floats,
            ...nodeCards,
            ...iconChips,
          ];
          gsap.set(visible, { clearProps: "all" });
          gsap.set(visible, { opacity: 1, y: 0, scale: 1 });
          if (nodesBand) gsap.set(nodesBand, { opacity: 1 });
          if (nodesHeading) gsap.set(nodesHeading, { opacity: 1 });
          gsap.set(connectorLines, { drawSVG: "0% 100%" });
          return;
        }

        // Initial states live in JS, never in CSS — the server HTML stays
        // fully visible for crawlers and for visitors without JavaScript.
        gsap.set(badge, { opacity: 0, y: 16 });
        gsap.set(subtext, { opacity: 0, y: 12 });
        gsap.set(ctaRow, { opacity: 0, y: 14, scale: 0.96 });
        gsap.set(assurance, { opacity: 0 });
        gsap.set(visual, { opacity: 0, y: 30, scale: 0.97 });
        gsap.set(floats, { opacity: 0, y: 18, scale: 0.94 });
        gsap.set(nodeCards, { opacity: 0, scale: 0.82, y: 12 });
        gsap.set(iconChips, { scale: 0.6 });
        if (nodesBand) gsap.set(nodesBand, { opacity: 0 });
        if (nodesHeading) gsap.set(nodesHeading, { opacity: 0 });
        gsap.set(connectorLines, { drawSVG: "0% 0%" });
        if (travelDot) gsap.set(travelDot, { opacity: 0, xPercent: -120 });

        let split: any = null;
        try {
          split = SplitText.create(h1, { type: "lines", mask: "lines" });
          if (split && split.lines && split.lines.length > 0) {
            gsap.set(split.lines, { yPercent: 110 });
          }
        } catch {
          gsap.set(h1, { opacity: 1 });
        }

        /**
         * The travelling dot rides the connector line. It is a separate tween
         * (not a child of the timeline) because an infinitely repeating child
         * would make the timeline's duration infinite.
         *
         * The tween runs on a normalised 0 → 1 progress and the modifier turns
         * that into pixels against the LIVE track width, so the dot keeps up
         * with the layout on resize without re-creating the tween.
         */
        const travel =
          travelTrack && travelDot
            ? gsap.to(travelDot, {
                x: 1,
                duration: 2.4,
                ease: "none",
                repeat: -1,
                paused: true,
                modifiers: {
                  x: (value: string) => {
                    const width = travelTrack.offsetWidth;
                    return `${gsap.utils.wrap(
                      0,
                      width,
                      parseFloat(value) * width,
                    )}px`;
                  },
                },
              })
            : null;

        const navAlreadyArrived =
          document.documentElement.dataset.navArrived === "true";
        const timeline = gsap.timeline({
          delay: navAlreadyArrived ? 0.1 : NAV_ARRIVAL_MS / 1000,
        });

        const headlineTarget =
          split && split.lines && split.lines.length > 0 ? split.lines : h1;

        timeline
          .to(
            badge,
            { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
            beat(0),
          )
          .to(
            headlineTarget,
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.85,
              ease: "power4.out",
              stagger: STAGGER,
            },
            beat(1),
          )
          .to(
            visual,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.9,
              ease: "power3.out",
            },
            beat(2),
          )
          .to(
            subtext,
            { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
            beat(3),
          )
          .to(
            ctaRow,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.7,
              ease: "back.out(1.4)",
            },
            beat(4),
          )
          .to(
            assurance,
            { opacity: 1, duration: 0.55, ease: "power2.out" },
            beat(5),
          )
          .to(
            floats,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.65,
              ease: "back.out(1.6)",
              stagger: STAGGER,
            },
            beat(6),
          )
          .to(
            connectorLines,
            {
              drawSVG: "0% 100%",
              duration: 0.9,
              ease: "power2.inOut",
              stagger: STAGGER,
            },
            beat(7),
          )
          .to(
            nodeCards,
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.75,
              ease: "back.out(1.6)",
              stagger: STAGGER,
            },
            beat(8),
          )
          .to(
            iconChips,
            { scale: 1, duration: 0.55, ease: "back.out(2)", stagger: STAGGER },
            beat(9),
          );

        // The whole node band was held invisible during the navbar hand-off;
        // reveal its frame just before the connector lines and cards arrive.
        if (nodesBand) {
          timeline.set(nodesBand, { opacity: 1 }, beat(7));
        }
        if (nodesHeading) {
          timeline.set(nodesHeading, { opacity: 1 }, beat(7));
        }

        /**
         * The travelling dot joins last and only starts moving once it has
         * faded in, so it never appears to glide along a line that has not
         * been drawn yet.
         */
        if (travelDot) {
          timeline.to(
            travelDot,
            {
              opacity: 1,
              duration: 0.45,
              ease: "medilink",
              onComplete: () => travel?.play(),
            },
            beat(10),
          );
        }

        /* Hover micro-interactions — deliberately outside the entrance timeline. */
        nodeCards.forEach((card, index) => {
          const chip = card.querySelector<HTMLElement>("[data-node-chip]");
          const adjacent = [
            connectorLines[index - 1],
            connectorLines[index],
          ].filter(Boolean) as SVGLineElement[];

          const onEnter = () => {
            gsap.to(card, { y: -4, duration: 0.25, ease: "power2.out" });
            if (chip) {
              gsap.to(chip, { scale: 1.08, duration: 0.25, ease: "medilink" });
            }
            adjacent.forEach((line) => {
              gsap.to(line, {
                strokeWidth: 3,
                duration: 0.25,
                ease: "power2.out",
              });
            });
          };

          const onLeave = () => {
            gsap.to(card, { y: 0, duration: 0.25, ease: "power2.out" });
            if (chip) {
              gsap.to(chip, { scale: 1, duration: 0.25, ease: "medilink" });
            }
            adjacent.forEach((line) => {
              gsap.to(line, {
                strokeWidth: 2,
                duration: 0.25,
                ease: "power2.out",
              });
            });
          };

          if (typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            card.addEventListener("mouseenter", onEnter);
            card.addEventListener("mouseleave", onLeave);
            disposers.push(() => {
              card.removeEventListener("mouseenter", onEnter);
              card.removeEventListener("mouseleave", onLeave);
            });
          }
        });

        return () => {
          disposers.forEach((dispose) => dispose());
          disposers.length = 0;
          if (split) {
            try {
              split.revert();
            } catch {
              // ignore
            }
          }
        };
      });
    }, root);

    return () => {
      media?.revert();
      context?.revert();
    };
  }, []);

  return (
    <section
      id="hero-section"
      ref={rootRef}
      className="hero-section relative bg-bg-main overflow-x-clip"
    >
      {/* Atmosphere — a soft brand halo behind the product visual plus a faint
          dot grid. Purely decorative; the page surface stays white. */}
      <div aria-hidden className="hero-backdrop pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1240px] flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 lg:min-h-[max(640px,88svh)] lg:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)] lg:gap-8 xl:gap-10">
          {/* ═══════════════════════════════════════════════════════
              LEFT — the promise
              ═══════════════════════════════════════════════════════ */}
          <div className="max-w-[720px] xl:max-w-none">
            {/* Eyebrow badge */}
            <div
              data-hero-badge
              className={`mb-7 inline-flex items-center gap-2.5 rounded-full border border-brand/15 bg-brand-light/70 py-2 pl-3 pr-4 font-sans text-[12.5px] font-semibold text-brand ${
                language === "bn" ? "font-bengali text-[13.5px]" : ""
              }`}
            >
              <span aria-hidden className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t.hero.badge}
            </div>

            {/* Headline */}
            <h1
              ref={h1Ref}
              data-hero-h1
              className={`mb-6 font-heading text-[clamp(2.25rem,4vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.03em] ${
                language === "bn" ? "font-bengali" : ""
              }`}
            >
              <span className="text-text-primary">
                {t.hero.h1Line1}{" "}
              </span>
              <br />
              <span className="text-brand">{t.hero.h1Line2}</span>
            </h1>

            {/* Subtext */}
            <p
              data-hero-subtext
              className={`mb-9 max-w-[520px] font-sans text-[17.5px] leading-[1.72] text-text-muted ${
                language === "bn" ? "font-bengali text-[18px]" : ""
              }`}
            >
              {t.hero.subtext}
            </p>

            {/* Calls to action */}
            <div
              data-hero-cta
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <Link
                href="/chat"
                className={`hero-cta-primary inline-flex items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-brand bg-brand px-8 py-3.5 font-heading text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark hover:bg-brand-dark ${
                  language === "bn" ? "font-bengali text-[16px]" : ""
                } ${FOCUS_RING}`}
              >
                {t.hero.drMediLink}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>

              <Link
                href="/doctors"
                className={`inline-flex items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-brand bg-white px-8 py-3.5 font-heading text-[15px] font-bold text-brand transition-all duration-300 hover:-translate-y-1 hover:bg-brand hover:text-white ${
                  language === "bn" ? "font-bengali text-[16px]" : ""
                } ${FOCUS_RING}`}
              >
                {t.hero.findDoctor}
              </Link>

              <Link
                href="/subscription"
                className={`inline-flex items-center justify-center gap-1 py-3.5 font-sans text-[14px] font-medium text-text-muted underline-offset-4 transition-colors duration-300 hover:text-brand hover:underline ${
                  language === "bn" ? "font-bengali text-[15px]" : ""
                } ${FOCUS_RING}`}
              >
                {t.hero.goPremium} <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Micro-assurance line */}
            <p
              data-hero-assurance
              className={`mt-6 font-sans text-[13px] text-text-muted ${
                language === "bn" ? "font-bengali text-[14px]" : ""
              }`}
            >
              {t.hero.assurance}
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════
              RIGHT — the product, in the patient's own language
              ═══════════════════════════════════════════════════════ */}
          <div
            data-hero-visual
            className="relative mx-auto w-full max-w-[480px] lg:max-w-none"
          >
            <p className="sr-only">
              Product preview: Dr. MediLink, MediLink AI&apos;s Bangla-first
              assistant, answering a patient who describes three days of fever
              and a sore throat, and offering to connect a doctor.
            </p>

            <div aria-hidden className="relative">
              {/* Chat window */}
              <div className="hero-visual-card relative z-10 overflow-hidden rounded-[22px] border border-border-soft bg-white">
                {/* Window chrome — desktop only, the phone gets a bare chat */}
                <div className="hidden items-center gap-1.5 border-b border-border-soft bg-bg-soft/70 px-5 py-3 sm:flex">
                  <span className="h-2.5 w-2.5 rounded-full bg-border-soft" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-soft" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border-soft" />
                  <span className="ml-2.5 truncate rounded-md bg-white px-2 py-1 font-sans text-[11px] text-text-muted">
                    medilink.ai/chat
                  </span>
                </div>

                {/* Assistant header — mirrors the real chat header */}
                <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light font-heading text-[13px] font-bold text-brand">
                    DM
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-success" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-[15px] font-bold leading-tight text-text-primary">
                      Dr. MediLink
                    </p>
                    <p className="font-sans text-[12px] text-text-muted">
                      AI health assistant · Bangla &amp; English
                    </p>
                  </div>
                </div>

                {/* Conversation */}
                <div className="space-y-3 px-5 py-5">
                  <p
                    lang="bn"
                    className="ml-auto max-w-[80%] rounded-[18px] rounded-tr-sm bg-brand px-4 py-2.5 font-bengali text-[14px] leading-[1.8] text-white"
                  >
                    ভাই, তিন দিন ধরে জ্বর আর গলা ব্যথা। এখন কী করব?
                  </p>
                  <div className="flex gap-2.5">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-heading text-[10px] font-bold text-white">
                      DM
                    </span>
                    <p
                      lang="bn"
                      className="max-w-[84%] rounded-[18px] rounded-tl-sm border border-border-soft bg-white px-4 py-2.5 font-bengali text-[14px] leading-[1.8] text-text-primary"
                    >
                      বেশি পানি খান, শরীর ঠান্ডা রাখুন। দুই দিনে উন্নতি না হলে
                      আমাদের ডাক্তারের সাথে কথা বলুন।
                    </p>
                  </div>

                  {/* The handoff the assistant offers next */}
                  <div className="ml-[38px] max-w-[84%]">
                    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-brand/20 bg-brand-light/60 px-3.5 py-2.5">
                      <span className={`flex items-center gap-2 font-sans text-[12.5px] font-semibold text-brand ${language === "bn" ? "font-bengali text-[13.5px]" : ""}`}>
                        <Stethoscope className="h-4 w-4" />
                        {t.hero.chatCard.specialistAction}
                      </span>
                      <span className={`shrink-0 font-sans text-[11px] font-medium text-brand/70 ${language === "bn" ? "font-bengali text-[12px]" : ""}`}>
                        {t.hero.chatCard.specialistCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick replies — mirrors the real suggested prompts */}
                <div className="hidden flex-wrap gap-2 border-t border-border-soft bg-bg-soft/40 px-5 py-4 sm:flex">
                  {["ডাক্তার দেখান", "ঔষধ অর্ডার", "জরুরি সাহায্য"].map(
                    (prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-border-soft bg-white px-3 py-1.5 font-bengali text-[12.5px] font-medium text-brand"
                      >
                        {prompt}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* The one warm note in an otherwise cool palette — it hangs off
                  the window chrome, which carries no content. */}
              <div
                data-hero-float
                className="hero-float-card absolute right-2 -top-4 sm:-right-4 sm:-top-5 xl:-right-7 z-20 w-[165px] sm:w-[186px] rounded-2xl border border-border-soft bg-white p-3 sm:p-3.5 shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emergency-soft text-emergency">
                    <Siren className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={`font-heading text-[13px] font-bold leading-tight text-text-primary ${language === "bn" ? "font-bengali text-[14px]" : ""}`}>
                      {language === "bn" ? "জরুরি ৯৯৯" : "Emergency 999"}
                    </p>
                    <p className={`font-sans text-[11px] text-text-muted ${language === "bn" ? "font-bengali text-[12px]" : ""}`}>
                      {language === "bn" ? "নিকটস্থ ৫টি হাসপাতাল" : "5 hospitals nearby"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            NODE BAND — the care journey as one connected line
            ═══════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="hero-services-heading"
          className="mt-10 border-t border-border-soft pt-8 xl:mt-12"
        >
          <h2
            id="hero-services-heading"
            data-hero-nodes-heading
            className={`mb-6 inline-flex items-center gap-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-brand ${language === "bn" ? "font-bengali text-[13px]" : ""}`}
          >
            <span aria-hidden className="h-0.5 w-[18px] rounded-full bg-brand" />
            {language === "bn" ? "মেডি-লিংক কীভাবে সাহায্য করে" : "How MediLink helps"}
          </h2>

          <div
            data-hero-nodes
            className="relative flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5 xl:flex xl:flex-row xl:items-stretch xl:gap-0"
          >
            {heroNodes.map((node, index) => (
              <React.Fragment key={node.id}>
                <Link
                  href={node.href}
                  data-node-card={index}
                  className={`group relative z-10 flex min-w-0 flex-1 flex-col rounded-[18px] border border-border-soft bg-white p-5 shadow-xs transition-all duration-300 touch-manipulation select-none active:scale-[0.98] ${
                    node.emergency
                      ? "hover:border-emergency/40 hover:shadow-md"
                      : "hover:border-brand/40 hover:shadow-md"
                  } ${FOCUS_RING}`}
                >
                  <span
                    data-node-chip
                    aria-hidden="true"
                    className={`mb-3.5 flex h-10 w-10 items-center justify-center rounded-full ${
                      node.emergency
                        ? "bg-emergency-soft text-emergency"
                        : "bg-brand-light text-brand"
                    }`}
                  >
                    <node.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`font-heading text-[16px] font-bold text-text-primary ${language === "bn" ? "font-bengali text-[17px]" : ""}`}>
                    {node.title}
                  </h3>
                  <p className={`mt-1 text-[13px] text-text-muted ${language === "bn" ? "font-bengali text-[14px]" : ""}`}>
                    {node.subtitle}
                  </p>
                </Link>

                {index < heroNodes.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="relative hidden h-[40px] flex-1 self-center xl:block xl:min-w-[24px] xl:max-w-[110px]"
                  >
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 100 40"
                      preserveAspectRatio="none"
                      focusable="false"
                    >
                      <line
                        data-connector-line
                        x1="0"
                        y1="20"
                        x2="100"
                        y2="20"
                        stroke="rgb(var(--brand-rgb))"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                )}
              </React.Fragment>
            ))}

            {/* Travelling dot — rides the connector line, decorative only. */}
            <span
              aria-hidden="true"
              data-travel-track
              className="pointer-events-none absolute left-0 right-0 top-1/2 z-[5] hidden h-0 xl:block"
            >
              <span
                data-travel-dot
                className="absolute left-0 top-0 -mt-1 h-2 w-2 rounded-full bg-brand"
              />
            </span>
          </div>
        </section>
      </div>

      <style jsx>{`
        /* ── Atmosphere ──────────────────────────────────────────────
           One dominant hue (teal), one supporting surface (soft blue),
           one rare accent (emergency red) used exactly once. */
        .hero-backdrop {
          background:
            radial-gradient(
              44% 40% at 76% 22%,
              rgb(var(--brand-rgb) / 0.13) 0%,
              transparent 68%
            ),
            radial-gradient(
              38% 36% at 6% 82%,
              rgb(var(--bg-soft-rgb) / 0.95) 0%,
              transparent 72%
            );
        }

        /* A faint dot grid, masked so it only reads around the visual. */
        .hero-backdrop::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(
            rgb(var(--brand-rgb) / 0.3) 1px,
            transparent 1px
          );
          background-size: 26px 26px;
          -webkit-mask-image: radial-gradient(
            40% 38% at 78% 20%,
            #000 0%,
            transparent 76%
          );
          mask-image: radial-gradient(
            40% 38% at 78% 20%,
            #000 0%,
            transparent 76%
          );
          opacity: 0.32;
        }

        /* The product window: a soft, layered, brand-tinted elevation. */
        .hero-visual-card {
          box-shadow:
            0 1px 2px rgb(var(--text-primary-rgb) / 0.04),
            0 16px 36px -18px rgb(var(--text-primary-rgb) / 0.18),
            0 48px 90px -44px rgb(var(--brand-rgb) / 0.3);
        }

        .hero-float-card {
          box-shadow:
            0 1px 2px rgb(var(--text-primary-rgb) / 0.05),
            0 14px 30px -12px rgb(var(--text-primary-rgb) / 0.16),
            0 30px 60px -34px rgb(var(--brand-rgb) / 0.24);
        }

        /* A brand-tinted glow instead of a neutral drop shadow. */
        .hero-cta-primary {
          box-shadow: 0 10px 24px -10px rgb(var(--brand-rgb) / 0.55);
        }
        .hero-cta-primary:hover {
          box-shadow: 0 18px 34px -12px rgb(var(--brand-rgb) / 0.6);
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
