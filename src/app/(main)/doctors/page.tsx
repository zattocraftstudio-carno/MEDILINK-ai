"use client";

import React, { useState, useMemo, useEffect } from "react";
import doctorsData from "@/data/doctors.json";
import { Doctor } from "@/types";
import { DoctorRow } from "@/components/doctors/DoctorRow";
import { DoctorDetailDrawer } from "@/components/doctors/DoctorDetailDrawer";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useSummaryStore } from "@/stores/useSummaryStore";
import { useAppointmentStore } from "@/stores/useAppointmentStore";
import {
  Coordinates,
  calculateDistanceKm,
  getCoordinatesForArea,
  getCurrentLocation,
} from "@/lib/geo";
import { Search, MapPin, Compass, Calendar, Bell, Trash2, Video, MessageSquare } from "lucide-react";

const SPECIALTIES = [
  "All",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Gynecology",
  "General Physician",
  "Neurology",
  "ENT",
  "Orthopedics",
  "Gastroenterology",
];

export default function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Geo / Nearby state
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [userAreaLabel, setUserAreaLabel] = useState<string>("");
  const [geoLoading, setGeoLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  const profile = useProfileStore((s) => s.profile);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  // The most recent chat handover summary, offered as an optional extra.
  const clinicalSummary = useSummaryStore((s) => s.getLatest());
  const appointments = useAppointmentStore((s) => s.getUpcomingAppointments());
  const cancelAppointment = useAppointmentStore((s) => s.cancelAppointment);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check the profile for initial coordinates.
  //
  // The coordinates are only used while "Nearby" is active — applying them
  // unconditionally made every row show a distance badge ("1.4 km away")
  // even when the patient had never granted location and the list was
  // NOT sorted by distance.
  useEffect(() => {
    if (!isNearbyActive) return;
    if (profile?.area) {
      const coords = getCoordinatesForArea(profile.area);
      if (coords) {
        setUserCoords(coords);
        setUserAreaLabel(profile.area);
      }
    }
  }, [profile?.area, isNearbyActive]);

  const handleToggleNearby = async () => {
    if (isNearbyActive) {
      setIsNearbyActive(false);
      // Clear the coordinates so no stale distance badge lingers.
      setUserCoords(null);
      setUserAreaLabel("");
      return;
    }

    setGeoLoading(true);
    try {
      const liveCoords = await getCurrentLocation();
      setUserCoords(liveCoords);
      setUserAreaLabel("Your Location");
      setIsNearbyActive(true);
    } catch {
      // Fallback to profile area or Dhaka default
      const area = profile?.area || "Dhaka";
      const fallbackCoords = getCoordinatesForArea(area);
      setUserCoords(fallbackCoords);
      setUserAreaLabel(area);
      setIsNearbyActive(true);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDrawerOpen(true);
  };

  // Doctors with calculated distances and filtering
  const processedDoctors = useMemo(() => {
    let list = (doctorsData as Doctor[]).map((doc) => {
      let distance: number | null = null;
      if (userCoords && doc.latitude && doc.longitude) {
        distance = calculateDistanceKm(userCoords, {
          latitude: doc.latitude,
          longitude: doc.longitude,
        });
      }
      return { doctor: doc, distance };
    });

    // Specialty filter
    if (selectedSpecialty !== "All") {
      list = list.filter(
        (item) =>
          item.doctor.specialty.toLowerCase() ===
          selectedSpecialty.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.doctor.name.toLowerCase().includes(q) ||
          item.doctor.specialty.toLowerCase().includes(q) ||
          item.doctor.area.toLowerCase().includes(q) ||
          item.doctor.bio.toLowerCase().includes(q)
      );
    }

    // Sort by distance if Nearby is active
    if (isNearbyActive) {
      list.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return list;
  }, [searchQuery, selectedSpecialty, isNearbyActive, userCoords]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-16">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[32px] md:text-[40px] font-heading font-extrabold text-text-primary tracking-tight">
          Find Doctor
        </h1>
        <p className="text-[16px] text-text-muted mt-1">
          Browse specialists near you and book consultations.
        </p>
      </div>

      {/* Upcoming Appointments Card */}
      {mounted && appointments.length > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-brand-light/70 to-bg-soft border border-brand/20 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              আপনার আসন্ন অ্যাপয়েন্টমেন্ট ({appointments.length})
            </h3>
            <span className="text-[12px] font-semibold text-brand flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-brand/20">
              <Bell className="w-3.5 h-3.5" /> রিমাইন্ডার সক্রিয়
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 bg-white rounded-xl border border-border-soft flex items-start justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-text-primary">
                      {apt.doctorName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-light text-brand">
                      {apt.specialty}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[13px] text-text-muted mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-text-primary">
                      <Calendar className="w-3.5 h-3.5 text-brand" /> {apt.date}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-text-primary">
                      {apt.time}
                    </span>
                    <span className="flex items-center gap-1 text-[12px]">
                      {apt.type === "video" ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-accent" /> Video
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-brand" /> Chat
                        </>
                      )}
                    </span>
                  </div>

                  {(apt.remind1DayBefore || apt.remind1HourBefore) && (
                    <div className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
                      <Bell className="w-3 h-3 text-brand" />
                      <span>
                        {apt.remind1DayBefore && "১ দিন আগে"}
                        {apt.remind1DayBefore && apt.remind1HourBefore && " ও "}
                        {apt.remind1HourBefore && "১ ঘণ্টা আগে"} অ্যালার্ট
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => cancelAppointment(apt.id)}
                  title="অ্যাপয়েন্টমেন্ট বাতিল করুন"
                  className="text-text-muted hover:text-emergency p-1.5 rounded-md hover:bg-emergency-soft transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Nearby Filter Bar */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <label htmlFor="doctor-search" className="sr-only">
              Search doctors by name or specialty
            </label>
            <Input
              id="doctor-search"
              type="search"
              autoComplete="off"
              placeholder="Search doctor or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-text-muted" aria-hidden="true" />}
            />
          </div>

          <Button
            type="button"
            variant={isNearbyActive ? "primary" : "secondary"}
            size="m"
            onClick={handleToggleNearby}
            isLoading={geoLoading}
            leftIcon={
              isNearbyActive ? (
                <MapPin className="w-4 h-4 text-white" />
              ) : (
                <Compass className="w-4 h-4 text-brand" />
              )
            }
            className="shrink-0"
          >
            {isNearbyActive
              ? `📍 ${userAreaLabel || "Nearby"}`
              : "Nearby"}
          </Button>
        </div>

        {/* Specialty Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SPECIALTIES.map((spec) => (
            <Chip
              key={spec}
              label={spec}
              active={selectedSpecialty === spec}
              onClick={() => setSelectedSpecialty(spec)}
            />
          ))}
        </div>
      </div>

      {/* Result count — announced when the list changes */}
      <p role="status" aria-live="polite" className="sr-only">
        {processedDoctors.length} doctor{processedDoctors.length === 1 ? "" : "s"} found
      </p>

      {/* Doctor List */}
      {processedDoctors.length === 0 ? (
        <div className="bg-white border border-border-soft rounded-[16px] p-12 text-center my-8">
          <h3 className="text-[20px] font-bold text-text-primary mb-2">
            No Doctors Found
          </h3>
          <p className="text-[15px] text-text-muted mb-6 max-w-sm mx-auto">
            We couldn't find any doctors matching your search.
          </p>
          <Button
            variant="secondary"
            size="m"
            onClick={() => {
              setSearchQuery("");
              setSelectedSpecialty("All");
              setIsNearbyActive(false);
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {processedDoctors.map(({ doctor, distance }) => (
            <DoctorRow
              key={doctor.id}
              doctor={doctor}
              distanceKm={distance}
              onSelect={handleSelectDoctor}
              isPremium={mounted && isPremium}
            />
          ))}
        </div>
      )}

      {/* Doctor Detail Drawer */}
      <DoctorDetailDrawer
        doctor={selectedDoctor}
        isOpen={isDrawerOpen}
        clinicalSummary={clinicalSummary}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDoctor(null);
        }}
      />
    </div>
  );
}
