"use client";

import React from "react";
import Link from "next/link";
import { Phone, MessageSquare, Share2, Ambulance, AlertTriangle } from "lucide-react";
import { Profile } from "@/types";
import { generateEmergencyAlertMessage, createWhatsAppUrl } from "@/lib/whatsapp";
import { Coordinates } from "@/lib/geo";
import { normaliseBDPhone } from "@/lib/format";

interface EmergencyActionsProps {
  profile: Profile | null;
  coords: Coordinates | null;
  locationName?: string;
  /** The nearest hospital's ambulance line, when one is published. */
  ambulancePhone?: string | null;
}

export const EmergencyActions: React.FC<EmergencyActionsProps> = ({
  profile,
  coords,
  locationName,
  ambulancePhone,
}) => {
  const mapsUrl = coords
    ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
    : "";

  const smsText = `EMERGENCY ALERT: I need immediate help. ${
    coords
      ? `My location: ${mapsUrl}`
      : locationName
      ? `Location: ${locationName}`
      : ""
  }`.trim();

  /**
   * The shared-location actions need a RECIPIENT.
   *
   * Without one, `wa.me/<empty>` lands on wa.me's "no number" error page and
   * `sms:` opens a composer with nobody in the To: field — a dead end at
   * exactly the moment a patient is trying to alert their family. The
   * number is also normalised to the `8801XXXXXXXXX` form wa.me requires.
   */
  const contactPhone = normaliseBDPhone(profile?.emergencyContact?.phone ?? "");
  const canShare = Boolean(contactPhone);

  const handleShareWhatsApp = () => {
    if (!contactPhone) return;
    const message = generateEmergencyAlertMessage({
      profile: profile || {},
      lat: coords?.latitude,
      lng: coords?.longitude,
    });

    const url = createWhatsAppUrl(message, contactPhone);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // `tel:` links need digits only — the published hospital landlines carry
  // spaces and dashes ("02-55165088") which some dialers reject.
  const ambulanceDial = ambulancePhone
    ? ambulancePhone.replace(/[^\d+]/g, "")
    : "999";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
      {/* Action 1: Call 999 */}
      <a
        href="tel:999"
        className="bg-white border border-border-soft hover:border-emergency rounded-[16px] p-6 flex flex-col items-center text-center group transition-all duration-160 shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-emergency-soft text-emergency flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Phone className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
          Call 999
        </h3>
        <p className="text-[14px] text-text-muted mb-4">
          National emergency hotline
        </p>
        <span className="mt-auto text-[13px] font-bold text-emergency group-hover:underline">
          Dial Now
        </span>
      </a>

      {/* Action 2: Call Ambulance */}
      <a
        href={`tel:${ambulanceDial}`}
        className="bg-white border border-border-soft hover:border-emergency rounded-[16px] p-6 flex flex-col items-center text-center group transition-all duration-160 shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-emergency-soft text-emergency flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Ambulance className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
          Call Ambulance
        </h3>
        <p className="text-[14px] text-text-muted mb-4">
          {ambulancePhone ? "Hospital ambulance service" : "National ambulance service"}
        </p>
        <span className="mt-auto text-[13px] font-bold text-emergency group-hover:underline">
          {ambulancePhone ? `Call ${ambulancePhone}` : "Dial 999"}
        </span>
      </a>

      {/* Action 3: Send Location SMS */}
      {canShare ? (
        <a
          href={`sms:${contactPhone}?&body=${encodeURIComponent(smsText)}`}
          className="bg-white border border-border-soft hover:border-brand-soft rounded-[16px] p-6 flex flex-col items-center text-center group transition-all duration-160 shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-brand-light text-brand flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
            Send Location SMS
          </h3>
          <p className="text-[14px] text-text-muted mb-4">
            Opens SMS app with your location
          </p>
          <span className="mt-auto text-[13px] font-bold text-brand group-hover:underline">
            Draft SMS
          </span>
        </a>
      ) : (
        <div className="bg-bg-soft border border-border-soft rounded-[16px] p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-border-soft text-text-muted flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
            Send Location SMS
          </h3>
          <p className="text-[14px] text-text-muted mb-4">
            Add an emergency contact to share your location with them.
          </p>
          <Link
            href="/register"
            className="mt-auto text-[13px] font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-sm"
          >
            Add emergency contact
          </Link>
        </div>
      )}

      {/* Action 4: Share on WhatsApp */}
      {canShare ? (
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="bg-white border border-border-soft hover:border-whatsapp rounded-[16px] p-6 flex flex-col items-center text-center group transition-all duration-160 shadow-sm cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-whatsapp-soft text-whatsapp flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Share2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
            Share on WhatsApp
          </h3>
          <p className="text-[14px] text-text-muted mb-4">
            Send location to emergency contact
          </p>
          <span className="mt-auto text-[13px] font-bold text-whatsapp group-hover:underline">
            Share on WhatsApp
          </span>
        </button>
      ) : (
        <div className="bg-bg-soft border border-border-soft rounded-[16px] p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-border-soft text-text-muted flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="font-heading font-bold text-[18px] text-text-primary mb-1">
            Share on WhatsApp
          </h3>
          <p className="text-[14px] text-text-muted mb-4">
            Add an emergency contact to share your location with them.
          </p>
          <Link
            href="/register"
            className="mt-auto text-[13px] font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-sm"
          >
            Add emergency contact
          </Link>
        </div>
      )}
    </div>
  );
};
