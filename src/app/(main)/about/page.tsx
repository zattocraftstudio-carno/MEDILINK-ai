"use client";

import React from "react";
import Image from "next/image";
import { MessageSquare, Pill, Siren, Heart, Code, Palette, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-12 md:py-20 pb-28 md:pb-20 space-y-20">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto pt-6">
        <span className="inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-4">
          Our Story & Vision
        </span>
        <h1 className="text-[36px] md:text-[50px] font-heading font-extrabold text-text-primary tracking-tight leading-[1.12]">
          About MediLink AI
        </h1>
        <p className="text-[17px] md:text-[19px] text-text-muted mt-3.5 leading-relaxed">
          Bridging the gap between 170+ million citizens and reliable, immediate healthcare in Bangladesh.
        </p>
      </div>

      {/* Mission & Vision Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group bg-white border border-border-soft hover:border-brand/30 rounded-[24px] p-8 md:p-9 shadow-sm hover:shadow-[0_16px_36px_rgba(23,120,111,0.08)] transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="text-[22px] font-heading font-bold text-text-primary mb-3">
            Our Mission
          </h2>
          <p className="text-[15px] text-text-muted leading-relaxed">
            MediLink was built to democratize healthcare guidance across Bangladesh. We believe that fast symptom triage, transparent doctor discovery, instant emergency dispatch, and rapid medicine delivery can save lives every single day.
          </p>
        </div>

        <div className="group bg-white border border-border-soft hover:border-brand/30 rounded-[24px] p-8 md:p-9 shadow-sm hover:shadow-[0_16px_36px_rgba(23,120,111,0.08)] transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-[22px] font-heading font-bold text-text-primary mb-3">
            Why We Built MediLink
          </h2>
          <p className="text-[15px] text-text-muted leading-relaxed">
            Millions in Bangladesh face delays accessing healthcare, from overcrowded hospitals to counterfeit medications. MediLink unifies artificial intelligence with proven local delivery channels like WhatsApp to provide dignified, immediate health solutions.
          </p>
        </div>
      </div>

      {/* Services Mini-Grid */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-[26px] font-heading font-bold text-text-primary">
            Core Service Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white border border-border-soft hover:border-brand/30 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[17px] text-text-primary mb-2">
              AI Clinical Guidance
            </h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              Dr MediLink provides 24/7 empathetic symptom triage and medical insights.
            </p>
          </div>

          <div className="group bg-white border border-border-soft hover:border-brand/30 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
              <Pill className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[17px] text-text-primary mb-2">
              WhatsApp Pharmacy
            </h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              Direct prescription upload and verified medicine delivery under 2 hours.
            </p>
          </div>

          <div className="group bg-white border border-border-soft hover:border-brand/30 rounded-2xl p-6 text-center shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-emergency-soft text-emergency flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
              <Siren className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[17px] text-text-primary mb-2">
              Emergency SOS 999
            </h3>
            <p className="text-[14px] text-text-muted leading-relaxed">
              One-tap GPS broadcast to trusted emergency contacts and hospital routing.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          OUR TEAM — UNCOMMON EDITORIAL BENTO GRID
          ═══════════════════════════════════════════════ */}
      <div id="team-section" className="pt-6">
        <div className="text-center mb-12">
          <span className="inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-3">
            Sylhet Robotics Club
          </span>
          <h2 className="text-[32px] md:text-[42px] font-heading font-extrabold text-text-primary">
            Meet the Team
          </h2>
          <p className="font-sans text-[16px] text-text-muted max-w-md mx-auto mt-2">
            The visionary engineers and designers behind MediLink AI.
          </p>
        </div>

        {/* Uncommon Asymmetrical Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* ── CARD 1: Washik Jahan Yafi (Founder) — Prominent 7-col hero card ── */}
          <div className="lg:col-span-7 group bg-white border border-border-soft hover:border-brand/40 rounded-[28px] p-7 md:p-8 shadow-sm hover:shadow-[0_20px_45px_rgba(23,120,111,0.14)] transition-all duration-400 flex flex-col justify-between overflow-hidden relative">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-brand/20">
                <Image
                  src="/assets/team/yafi.jpeg"
                  alt="Washik Jahan Yafi"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-white font-sans text-[12px] font-bold tracking-wider uppercase mb-3 shadow-xs">
                  ★ Founder & Lead
                </span>
                <h3 className="font-heading font-extrabold text-[24px] text-text-primary mb-2">
                  Washik Jahan Yafi
                </h3>
                <p className="font-sans text-[14px] text-text-muted leading-relaxed mb-4">
                  Visionary leader spearheading MediLink's mission to connect millions across Bangladesh with instantaneous, empathetic, and life-saving digital healthcare infrastructure.
                </p>
                <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                  <span className="px-2.5 py-1 bg-bg-soft rounded-lg text-brand font-semibold text-[11px]">System Architecture</span>
                  <span className="px-2.5 py-1 bg-bg-soft rounded-lg text-brand font-semibold text-[11px]">Healthcare Innovation</span>
                </div>
              </div>
            </div>

            <div className="border-t border-brand/10 pt-4 mt-6 flex justify-between items-center text-[12px] text-text-muted">
              <span>Sylhet Robotics Club</span>
              <span className="text-brand font-semibold">Leadership</span>
            </div>
          </div>

          {/* ── Right Column: Stacked Cards for Developer & Designer (5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col gap-7">
            {/* ── CARD 2: Sadi Mohammad (Web Developer) ── */}
            <div className="group bg-white border border-border-soft hover:border-brand/40 rounded-[28px] p-6 shadow-sm hover:shadow-[0_16px_36px_rgba(23,120,111,0.12)] transition-all duration-400 flex items-center gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-brand/20">
                <Image
                  src="/assets/team/sadi.jpg"
                  alt="Sadi Mohammad"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2.5 py-0.5 rounded-full mb-1.5">
                  <Code className="w-3 h-3" />
                  Web Developer
                </span>
                <h3 className="font-heading font-bold text-[19px] text-text-primary truncate">
                  Sadi Mohammad
                </h3>
                <p className="font-sans text-[13px] text-text-muted leading-relaxed mt-1 line-clamp-2">
                  Full-stack Next.js engineer architecting the dual-layer AI fallback, WebGL DNA visualizer, and streaming infrastructure.
                </p>
              </div>
            </div>

            {/* ── CARD 3: Mohammad Isaba Islam (Lead Designer) ── */}
            <div className="group bg-white border border-border-soft hover:border-brand/40 rounded-[28px] p-6 shadow-sm hover:shadow-[0_16px_36px_rgba(23,120,111,0.12)] transition-all duration-400 flex items-center gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-brand/20">
                <Image
                  src="/assets/team/isaba.jpeg"
                  alt="Mohammad Isaba Islam"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-108"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2.5 py-0.5 rounded-full mb-1.5">
                  <Palette className="w-3 h-3" />
                  Lead Designer
                </span>
                <h3 className="font-heading font-bold text-[19px] text-text-primary truncate">
                  Mohammad Isaba Islam
                </h3>
                <p className="font-sans text-[13px] text-text-muted leading-relaxed mt-1 line-clamp-2">
                  UI/UX visionary designing accessible glassmorphism, responsive components, and intuitive patient journeys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
