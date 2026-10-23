import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "MediLink AI Premium — Unlimited Health Guidance",
  description: "Upgrade to MediLink AI Premium for unlimited AI consultations, Pro-mode answers, medication reminders and downloadable consultation summaries.",
  alternates: { canonical: "/subscription" },
  openGraph: {
    title: "MediLink AI Premium — Unlimited Health Guidance",
    description: "Upgrade to MediLink AI Premium for unlimited AI consultations, Pro-mode answers, medication reminders and downloadable consultation summaries.",
    url: "/subscription",
    type: "website",
  },
};

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
