"use client";

import React from "react";
import { ConsultationSummary, Doctor } from "@/types";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  generateDoctorBookingMessage,
  generateDoctorVideoBookingMessage,
  createWhatsAppUrl,
} from "@/lib/whatsapp";
import { Star, MapPin, GraduationCap, Clock, MessageSquare, Video, Stethoscope, Calendar, Bell } from "lucide-react";
import { useAppointmentStore } from "@/stores/useAppointmentStore";
import { useToast } from "@/components/ui/Toast";
import { requestNotificationPermission } from "@/lib/notifications";

interface DoctorDetailDrawerProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  /** Chat handover summary the patient may attach to the booking. */
  clinicalSummary?: ConsultationSummary | null;
}

export const DoctorDetailDrawer: React.FC<DoctorDetailDrawerProps> = ({
  doctor,
  isOpen,
  onClose,
  clinicalSummary,
}) => {
  const profile = useProfileStore((s) => s.profile);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const addAppointment = useAppointmentStore((s) => s.addAppointment);
  const { showToast } = useToast();

  const [includeSummary, setIncludeSummary] = React.useState(true);

  // Appointment scheduling states
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = React.useState(getTomorrowStr());
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState("11:30 AM");
  const [remind1Day, setRemind1Day] = React.useState(true);
  const [remind1Hour, setRemind1Hour] = React.useState(true);

  // A newly opened drawer should default to including the summary.
  React.useEffect(() => {
    if (isOpen) {
      setIncludeSummary(true);
      setSelectedDate(getTomorrowStr());
    }
  }, [isOpen, doctor?.id]);

  if (!doctor) return null;

  const initials = doctor.name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const feeWhatsappDiscounted = isPremium
    ? Math.round(doctor.feeWhatsapp * 0.8)
    : doctor.feeWhatsapp;
  const feeVideoDiscounted = isPremium
    ? Math.round(doctor.feeVideo * 0.8)
    : doctor.feeVideo;

  const summaryToSend = includeSummary ? clinicalSummary : null;

  const recordAppointment = (type: "chat" | "video") => {
    addAppointment({
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      type,
      date: selectedDate,
      time: selectedTimeSlot,
      remind1DayBefore: remind1Day,
      remind1HourBefore: remind1Hour,
      fee: type === "video" ? feeVideoDiscounted : feeWhatsappDiscounted,
    });
    void requestNotificationPermission();
    showToast("অ্যাপয়েন্টমেন্ট সংরক্ষিত এবং রিমাইন্ডার সেট করা হয়েছে!", "success");
  };

  const handleBookWhatsApp = () => {
    recordAppointment("chat");
    const message = generateDoctorBookingMessage({
      profile: profile || {},
      doctor: {
        ...doctor,
        feeWhatsapp: feeWhatsappDiscounted,
      },
      selectedDate,
      selectedTime: selectedTimeSlot,
      isPremium,
      clinicalSummary: summaryToSend,
    });
    const url = createWhatsAppUrl(message, doctor.whatsappNumber);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRequestVideoCall = () => {
    recordAppointment("video");
    const message = generateDoctorVideoBookingMessage({
      profile: profile || {},
      doctor: {
        ...doctor,
        feeVideo: feeVideoDiscounted,
      },
      selectedDate,
      selectedTime: selectedTimeSlot,
      isPremium,
      clinicalSummary: summaryToSend,
    });
    const url = createWhatsAppUrl(message, doctor.whatsappNumber);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={doctor.name}
      footer={
        <div className="w-full space-y-3">
          {clinicalSummary && (
            <label className="flex items-start gap-2.5 p-3 rounded-[12px] bg-bg-soft border border-border-soft cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#17786F]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13px] font-bold text-text-primary">
                  <Stethoscope className="w-3.5 h-3.5 text-brand" />
                  Include my chat summary
                </span>
                <span className="block text-[12px] text-text-muted mt-0.5">
                  {clinicalSummary.chiefComplaint}
                </span>
              </span>
            </label>
          )}

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <Button
              size="m"
              variant="secondary"
              className="flex-1"
              leftIcon={<Video className="w-4 h-4" />}
              onClick={handleRequestVideoCall}
            >
              Request Video Call
            </Button>
            <Button
              size="m"
              variant="primary"
              className="flex-1"
              leftIcon={<MessageSquare className="w-4 h-4" />}
              onClick={handleBookWhatsApp}
            >
              Book via WhatsApp
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pb-6">
        {/* Header Profile Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-border-soft bg-bg-soft flex items-center justify-center">
            <SafeImage
              src={doctor.photo}
              alt={doctor.name}
              fallbackType="initials"
              initials={initials}
              className="w-full h-full"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold px-2.5 py-0.5 rounded-full bg-brand-light text-brand">
                {doctor.specialty}
              </span>
              <span className="text-[13px] text-text-muted">
                {doctor.experienceYears} years exp.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[14px]">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <strong className="text-text-primary font-bold">{doctor.rating}</strong>
              </span>
              <span className="text-text-muted">({doctor.reviewCount} patient reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-[13px] text-text-muted mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{doctor.area}</span>
            </div>
          </div>
        </div>

        {/* Section 1: About */}
        <div className="pt-4 border-t border-border-soft">
          <h4 className="text-[15px] font-bold text-text-primary mb-2">About</h4>
          <p className="text-[14px] text-text-muted leading-relaxed">
            {doctor.bio}
          </p>
        </div>

        {/* Section 2: Education */}
        <div className="pt-4 border-t border-border-soft">
          <h4 className="text-[15px] font-bold text-text-primary mb-2">Education</h4>
          <ul className="space-y-1.5">
            {doctor.education.map((edu, idx) => (
              <li key={idx} className="flex items-center gap-2 text-[14px] text-text-muted">
                <GraduationCap className="w-4 h-4 text-brand shrink-0" />
                <span>{edu}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3: Consultation Fees */}
        <div className="pt-4 border-t border-border-soft">
          <h4 className="text-[15px] font-bold text-text-primary mb-3">Consultation Fees</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-bg-soft rounded-lg border border-border-soft">
              <div className="text-[12px] font-medium text-text-muted">WhatsApp Consultation</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[18px] font-heading font-extrabold text-brand">
                  ৳{feeWhatsappDiscounted}
                </span>
                {isPremium && (
                  <span className="text-[12px] text-text-muted line-through">
                    ৳{doctor.feeWhatsapp}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-bg-soft rounded-lg border border-border-soft">
              <div className="text-[12px] font-medium text-text-muted">Video Call</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[18px] font-heading font-extrabold text-brand">
                  ৳{feeVideoDiscounted}
                </span>
                {isPremium && (
                  <span className="text-[12px] text-text-muted line-through">
                    ৳{doctor.feeVideo}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isPremium && (
            <div className="text-[12px] text-accent font-bold mt-2">
              ✓ 20% MediLink Premium discount applied
            </div>
          )}
        </div>

        {/* Section 4: Availability */}
        <div className="pt-4 border-t border-border-soft">
          <h4 className="text-[15px] font-bold text-text-primary mb-2">Availability</h4>
          <div className="flex items-center gap-2 text-[14px] text-text-muted bg-bg-soft p-3 rounded-lg border border-border-soft">
            <Clock className="w-4 h-4 text-brand shrink-0" />
            <span>{doctor.availability}</span>
          </div>
        </div>

        {/* Section 4b: Schedule & Reminders */}
        <div className="pt-4 border-t border-border-soft space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-text-primary flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand" /> অ্যাপয়েন্টমেন্ট শিডিউল ও রিমাইন্ডার
            </h4>
            <span className="text-[11px] font-semibold text-brand bg-brand-light px-2 py-0.5 rounded-full">
              Automated Alert
            </span>
          </div>

          <div className="p-4 bg-bg-soft rounded-xl border border-border-soft space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-muted mb-1.5">
                পছন্দের তারিখ (Preferred Date)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-[14px] text-text-primary focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-text-muted mb-1.5">
                সময় স্লট (Time Slot)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["10:00 AM", "11:30 AM", "03:30 PM", "05:00 PM", "07:30 PM", "09:00 PM"].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`py-1.5 px-2 rounded-lg text-[12px] font-medium border text-center transition-colors ${
                      selectedTimeSlot === slot
                        ? "bg-brand text-white border-brand font-bold shadow-xs"
                        : "bg-white border-border text-text-muted hover:border-brand-light"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border-soft/60 space-y-2">
              <span className="block text-[12px] font-bold text-text-primary flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-brand" /> রিমাইন্ডার নোটিফিকেশন
              </span>
              <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={remind1Day}
                  onChange={(e) => setRemind1Day(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#17786F]"
                />
                <span>১ দিন আগে মনে করিয়ে দিন (1 day before)</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={remind1Hour}
                  onChange={(e) => setRemind1Hour(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#17786F]"
                />
                <span>১ ঘণ্টা আগে নোটিফিকেশন পাঠান (1 hour before)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Patient Reviews */}
        <div className="pt-4 border-t border-border-soft">
          <h4 className="text-[15px] font-bold text-text-primary mb-3">
            Patient Reviews ({doctor.reviews.length})
          </h4>
          <div className="space-y-3">
            {doctor.reviews.map((rev, idx) => (
              <div key={idx} className="p-4 bg-bg-soft rounded-[12px] border border-border-soft">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold text-[14px] text-text-primary">{rev.userName}</div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, starI) => (
                      <Star
                        key={starI}
                        className={`w-3.5 h-3.5 ${
                          starI < rev.rating
                            ? "fill-accent text-accent"
                            : "fill-border-soft text-border-soft"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[12px] text-text-muted mb-2">{rev.area}</div>
                <p className="text-[13px] text-text-primary leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
