"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { TextLink } from "@/components/ui/TextLink";
import { useToast } from "@/components/ui/Toast";
import { useProfileStore } from "@/stores/useProfileStore";
import { Profile } from "@/types";
import { normaliseBDPhone } from "@/lib/format";

const AREAS = ["Dhaka", "Mirpur", "Gulshan", "Banani", "Uttara", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh", "Other"];
const DISEASES = ["None", "Diabetes", "High Blood Pressure", "Asthma", "Heart Disease", "Thyroid", "Kidney Disease", "Arthritis"];
const ALLERGIES = ["None", "Penicillin", "Sulfa Drugs", "Seafood", "Peanuts", "Dust", "Pollen"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Don't Know"];
const AGE_GROUPS = ["Under 18", "18-30", "31-45", "46-60", "60+"];
const GENDERS = ["Male", "Female", "Prefer not to say"];

const PHONE_ERROR =
  "Enter a valid 10-digit Bangladeshi mobile number (e.g., 1712345678).";

/**
 * The form shows a +880 prefix, so the visible/stored form value is the
 * 10-digit national part (`1712345678`). `normaliseBDPhone` understands
 * both that and the local `01712345678` form; convert back for the input.
 */
const toPhoneInput = (value?: string): string => {
  const normalised = normaliseBDPhone(value || "");
  if (normalised) return normalised.slice(3);

  let digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/** Store the canonical local form (`01XXXXXXXXX`) used by the rest of the app. */
const toStoredPhone = (value?: string): string => {
  const normalised = normaliseBDPhone(value || "");
  return normalised ? `0${normalised.slice(3)}` : (value || "").trim();
};

const isValidPhoneInput = (value?: string): boolean =>
  Boolean(normaliseBDPhone(value || ""));

export default function RegisterPage() {
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);
  const existingProfile = useProfileStore((s) => s.profile);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Profile>>(() => {
    if (!existingProfile) return { diseases: [], allergies: [] };
    return {
      ...existingProfile,
      phone: toPhoneInput(existingProfile.phone),
      emergencyContact: existingProfile.emergencyContact
        ? {
            ...existingProfile.emergencyContact,
            phone: toPhoneInput(existingProfile.emergencyContact.phone),
          }
        : undefined,
    };
  });

  const [customAllergy, setCustomAllergy] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prefilled = useRef(false);

  const { showToast } = useToast();

  /**
   * Zustand persist hydrates from localStorage after the first render on a
   * fresh page load. Fill the form once that profile arrives, but never
   * overwrite a field the patient has already started typing into.
   */
  useEffect(() => {
    if (prefilled.current || !existingProfile) return;
    prefilled.current = true;
    setFormData((prev) => {
      if (prev.name || prev.phone) return prev;
      return {
        ...existingProfile,
        phone: toPhoneInput(existingProfile.phone),
        emergencyContact: existingProfile.emergencyContact
          ? {
              ...existingProfile.emergencyContact,
              phone: toPhoneInput(existingProfile.emergencyContact.phone),
            }
          : undefined,
      };
    });
  }, [existingProfile]);

  const update = (patch: Partial<Profile>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const handleNext = () => {
    if (step === 1) {
      const nextErrors: Record<string, string> = {};
      if (!formData.name || !formData.name.trim()) {
        nextErrors.name = "Please enter your name.";
      }
      if (!isValidPhoneInput(formData.phone)) {
        nextErrors.phone = PHONE_ERROR;
      }
      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        const firstError = document.getElementById(
          nextErrors.name ? "reg-name" : "reg-phone"
        );
        firstError?.focus();
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name || !formData.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }
    if (!isValidPhoneInput(formData.phone)) {
      nextErrors.phone = PHONE_ERROR;
    }
    if (!consent) {
      nextErrors.consent = "Please accept the notice before continuing.";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Inline errors are enough here; a bottom-centre toast would cover the
      // very button the patient needs to press again.
      const firstError = document.getElementById(
        nextErrors.name ? "reg-name" : nextErrors.phone ? "reg-phone" : "reg-consent"
      );
      firstError?.focus();
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const name = (formData.name || "").trim();
    const phone = toStoredPhone(formData.phone);
    const emergencyContact = formData.emergencyContact
      ? {
          ...formData.emergencyContact,
          phone: toStoredPhone(formData.emergencyContact.phone),
        }
      : undefined;

    setProfile({
      name,
      phone,
      area: formData.area || "",
      diseases: formData.diseases || [],
      allergies: formData.allergies || [],
      bloodGroup: formData.bloodGroup,
      ageGroup: formData.ageGroup,
      gender: formData.gender,
      emergencyContact,
      consentGiven: true,
    });
    showToast("Profile saved successfully!", "success");
    setStep(4); // Success step
  };

  const toggleArrayItem = (key: "diseases" | "allergies", item: string) => {
    const arr = formData[key] || [];
    if (item === "None") {
      update({ [key]: ["None"] });
      return;
    }
    let newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    newArr = newArr.filter(i => i !== "None"); // Remove "None" if other selected
    update({ [key]: newArr });
  };

  if (step === 4) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-16 md:py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-success-soft text-success-dark flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[28px] font-heading font-extrabold text-text-primary mb-3">
          Welcome, {formData.name}!
        </h1>
        <p className="text-[16px] text-text-muted mb-8">
          Your profile has been saved. You can now explore MediLink.
        </p>
        <Button size="l" fullWidth onClick={() => router.push("/")}>
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[540px] mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-8">
        <h1 className="text-[28px] md:text-[32px] font-heading font-extrabold text-text-primary mb-2">
          Tell Us About Yourself
        </h1>
        <p className="text-[15px] text-text-muted">
          Dr MediLink and our doctors can give you better advice with this information.
        </p>
      </div>

      <div className="bg-white border border-border-soft rounded-[16px] p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[14px] font-bold text-brand">Step {step} of 3</span>
          <div className="flex gap-2" aria-hidden="true">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-2.5 h-2.5 rounded-full ${s === step ? "bg-brand" : s < step ? "bg-brand-light" : "bg-bg-soft"}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-[20px] font-bold text-text-primary mb-4">Basic Information</h2>

            <div>
              <label htmlFor="reg-name" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Your Full Name
              </label>
              <Input
                id="reg-name"
                placeholder="e.g., Rahim Ahmed"
                value={formData.name || ""}
                error={errors.name}
                onChange={(e) => update({ name: e.target.value })}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="w-16 shrink-0 bg-bg-soft border border-border-soft rounded-md flex items-center justify-center font-bold text-text-primary text-[15px] select-none">
                  +880
                </div>
                <Input
                  id="reg-phone"
                  placeholder="1XXXXXXXXX"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={formData.phone || ""}
                  error={errors.phone}
                  onChange={(e) => update({ phone: toPhoneInput(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-area" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Your Area
              </label>
              <select
                id="reg-area"
                className="w-full h-12 px-4 rounded-md border border-border-soft bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent appearance-none"
                value={formData.area || ""}
                onChange={(e) => update({ area: e.target.value })}
              >
                <option value="" disabled>Select your area</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-[20px] font-bold text-text-primary mb-4">Health Profile</h2>

            <fieldset>
              <legend className="block text-[14px] font-bold text-text-primary mb-2.5">
                Do you have any ongoing conditions?
              </legend>
              <div className="flex flex-wrap gap-2">
                {DISEASES.map(d => (
                  <Chip
                    key={d}
                    label={d}
                    active={(formData.diseases || []).includes(d)}
                    onClick={() => toggleArrayItem("diseases", d)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block text-[14px] font-bold text-text-primary mb-2.5">
                Any known allergies?
              </legend>
              <div className="flex flex-wrap gap-2 mb-3">
                {ALLERGIES.map(a => (
                  <Chip
                    key={a}
                    label={a}
                    active={(formData.allergies || []).includes(a)}
                    onClick={() => toggleArrayItem("allergies", a)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="reg-custom-allergy"
                  placeholder="Or type another allergy..."
                  value={customAllergy}
                  onChange={(e) => setCustomAllergy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customAllergy.trim()) {
                      e.preventDefault();
                      toggleArrayItem("allergies", customAllergy.trim());
                      setCustomAllergy("");
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (customAllergy.trim()) {
                      toggleArrayItem("allergies", customAllergy.trim());
                      setCustomAllergy("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-[20px] font-bold text-text-primary mb-4">Optional Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-blood" className="block text-[14px] font-bold text-text-primary mb-1.5">
                  Blood Group (Optional)
                </label>
                <select
                  id="reg-blood"
                  className="w-full h-12 px-3 rounded-md border border-border-soft bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-brand"
                  value={formData.bloodGroup || ""}
                  onChange={(e) => update({ bloodGroup: e.target.value })}
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="reg-age" className="block text-[14px] font-bold text-text-primary mb-1.5">
                  Age Group (Optional)
                </label>
                <select
                  id="reg-age"
                  className="w-full h-12 px-3 rounded-md border border-border-soft bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-brand"
                  value={formData.ageGroup || ""}
                  onChange={(e) => update({ ageGroup: e.target.value })}
                >
                  <option value="">Select</option>
                  {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reg-gender" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Gender (Optional)
              </label>
              <select
                id="reg-gender"
                className="w-full h-12 px-3 rounded-md border border-border-soft bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-brand"
                value={formData.gender || ""}
                onChange={(e) => update({ gender: e.target.value })}
              >
                <option value="">Select</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <fieldset className="border-t border-border-soft pt-5 mt-5">
              <legend className="block text-[14px] font-bold text-text-primary mb-3">
                Emergency Contact (Optional)
              </legend>
              <div className="space-y-3">
                <Input
                  id="reg-emg-name"
                  placeholder="Contact Name"
                  value={formData.emergencyContact?.name || ""}
                  onChange={(e) =>
                    update({
                      emergencyContact: {
                        ...formData.emergencyContact,
                        phone: formData.emergencyContact?.phone || "",
                        name: e.target.value,
                      },
                    })
                  }
                />
                <div className="flex gap-2">
                  <div className="w-14 shrink-0 bg-bg-soft border border-border-soft rounded-md flex items-center justify-center font-medium text-text-muted text-[13px] select-none">
                    +880
                  </div>
                  <Input
                    id="reg-emg-phone"
                    placeholder="Phone Number"
                    inputMode="numeric"
                    value={formData.emergencyContact?.phone || ""}
                    onChange={(e) =>
                      update({
                        emergencyContact: {
                          ...formData.emergencyContact,
                          name: formData.emergencyContact?.name || "",
                          phone: toPhoneInput(e.target.value),
                        },
                      })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </fieldset>

            {/* Consent must be an actual, recorded action — the profile used to
                hard-code consentGiven: true regardless of what the patient did. */}
            <div className="bg-brand-light/30 rounded-md p-4 mt-6">
              <label
                htmlFor="reg-consent"
                className="flex items-start gap-3 text-[13px] text-text-primary cursor-pointer"
              >
                <input
                  id="reg-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setErrors((p) => ({ ...p, consent: "" }));
                  }}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "reg-consent-error" : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[#17786F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                <span>
                  I understand that MediLink AI is not a doctor, and that I should call
                  999 in an emergency. I agree that the information in this profile may
                  be used to personalise my consultations.
                </span>
              </label>
              {errors.consent && (
                <p id="reg-consent-error" role="alert" className="mt-2 text-[12px] text-emergency font-medium flex items-center gap-1">
                  {errors.consent}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-10">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack}>← Back</Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-4">
            <TextLink onClick={() => router.push("/")} className="text-[14px] font-medium text-text-muted hover:text-text-primary">
              Skip for now
            </TextLink>

            {step < 3 ? (
              <Button onClick={handleNext}>Next →</Button>
            ) : (
              <Button onClick={handleComplete}>
                Complete Registration
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
