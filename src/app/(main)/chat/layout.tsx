import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Talk to Dr. MediLink AI — Free Health Guidance",
  description: "Ask Dr. MediLink AI about your symptoms in Bangla or English. Get calm, structured health guidance in under two seconds — free to start, no account needed.",
  alternates: { canonical: "/chat" },
  openGraph: {
    title: "Talk to Dr. MediLink AI — Free Health Guidance",
    description: "Ask Dr. MediLink AI about your symptoms in Bangla or English. Get calm, structured health guidance in under two seconds — free to start, no account needed.",
    url: "/chat",
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
