import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Appointment } from "@/types";

interface AppointmentState {
  appointments: Appointment[];
  addAppointment: (
    data: Omit<Appointment, "id" | "createdAt" | "status">
  ) => Appointment;
  cancelAppointment: (id: string) => void;
  completeAppointment: (id: string) => void;
  deleteAppointment: (id: string) => void;
  getUpcomingAppointments: () => Appointment[];
  getPastAppointments: () => Appointment[];
}

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      appointments: [],

      addAppointment: (data) => {
        const id = `apt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newAppointment: Appointment = {
          id,
          createdAt: Date.now(),
          status: "upcoming",
          ...data,
        };

        set((state) => ({
          appointments: [newAppointment, ...state.appointments],
        }));

        return newAppointment;
      },

      cancelAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.map((apt) =>
            apt.id === id ? { ...apt, status: "cancelled" } : apt
          ),
        })),

      completeAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.map((apt) =>
            apt.id === id ? { ...apt, status: "completed" } : apt
          ),
        })),

      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((apt) => apt.id !== id),
        })),

      getUpcomingAppointments: () => {
        const now = Date.now();
        return get().appointments.filter((apt) => {
          if (apt.status !== "upcoming") return false;
          // check date
          const aptDate = new Date(`${apt.date}T${apt.time || "00:00"}`).getTime();
          return isNaN(aptDate) || aptDate >= now - 2 * 3600 * 1000;
        });
      },

      getPastAppointments: () => {
        const now = Date.now();
        return get().appointments.filter((apt) => {
          if (apt.status !== "upcoming") return true;
          const aptDate = new Date(`${apt.date}T${apt.time || "00:00"}`).getTime();
          return !isNaN(aptDate) && aptDate < now - 2 * 3600 * 1000;
        });
      },
    }),
    {
      name: "medilink_appointments",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
