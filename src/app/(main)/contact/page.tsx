"use client";

import React from "react";
import { Phone, Mail, Facebook, Instagram, ArrowUpRight } from "lucide-react";

export default function ContactPage() {
  const contactCards = [
    {
      title: "Phone Support",
      value: "+880 1811-389672",
      actionLabel: "Tap to Call",
      href: "tel:+8801811389672",
      icon: Phone,
      color: "text-brand",
      bg: "bg-brand-light",
    },
    {
      title: "Official Email",
      value: "medilink123@gmail.com",
      actionLabel: "Send Email",
      href: "mailto:medilink123@gmail.com",
      icon: Mail,
      color: "text-brand",
      bg: "bg-brand-light",
    },
    {
      title: "Facebook Page",
      value: "Sylhet Robotics Club",
      actionLabel: "Visit Page",
      href: "https://www.facebook.com/profile.php?id=61587520773135",
      icon: Facebook,
      color: "text-[#1877F2]",
      bg: "bg-[#1877F2]/10",
      external: true,
    },
    {
      title: "Instagram",
      value: "@sylhetroboticsclub",
      actionLabel: "Follow Us",
      href: "https://www.instagram.com/sylhetroboticsclub",
      icon: Instagram,
      color: "text-[#E4405F]",
      bg: "bg-[#E4405F]/10",
      external: true,
    },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-10 md:py-16 pb-24 md:pb-16">
      {/* Page Header */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <h1 className="text-[34px] md:text-[46px] font-heading font-extrabold text-text-primary tracking-tight">
          Get in Touch
        </h1>
        <p className="text-[17px] md:text-[19px] text-text-muted mt-3 leading-relaxed">
          We&apos;re here to help. Reach out via phone, email, or social media.
        </p>
      </div>

      {/* 4 Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contactCards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            target={card.external ? "_blank" : undefined}
            rel={card.external ? "noopener noreferrer" : undefined}
            className="bg-white border border-border-soft rounded-[18px] p-6 flex flex-col justify-between hover:border-brand-soft hover:shadow-md transition-all duration-200 group"
          >
            <div>
              <div
                className={`w-12 h-12 rounded-[14px] ${card.bg} ${card.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <h2 className="text-[14px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {card.title}
              </h2>
              <p className="text-[18px] font-heading font-bold text-text-primary group-hover:text-brand transition-colors">
                {card.value}
              </p>
            </div>

            <div className="pt-6 mt-4 border-t border-border-soft flex items-center justify-between text-[14px] font-bold text-brand">
              <span>{card.actionLabel}</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </a>
        ))}
      </div>

      {/* Organization Badge */}
      <div className="mt-16 text-center">
        <div className="inline-block p-4 rounded-xl bg-bg-soft border border-border-soft">
          <p className="text-[13px] text-text-muted font-medium">
            MediLink is developed and maintained by{" "}
            <strong className="text-text-primary">Sylhet Robotics Club</strong>
            , Sylhet, Bangladesh.
          </p>
        </div>
      </div>
    </div>
  );
}
