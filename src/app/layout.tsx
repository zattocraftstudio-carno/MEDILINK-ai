import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, Hind_Siliguri } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-head",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  // 700 was missing while `font-bold` is used ~160 times across the app —
  // every one of those labels was rendered with SYNTHETIC (faux) bold.
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://medilink.ai"
  ),
  title: {
    default: "MediLink — Your Health, One Link Away",
    template: "%s · MediLink AI",
  },
  description:
    "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services.",
  applicationName: "MediLink AI",
  keywords: [
    "AI doctor Bangladesh",
    "online medicine delivery Bangladesh",
    "doctor booking Dhaka",
    "emergency medical help 999",
    "health chatbot Bangla",
  ],
  authors: [{ name: "MediLink AI" }],
  openGraph: {
    type: "website",
    locale: "en_BD",
    siteName: "MediLink AI",
    title: "MediLink — Your Health, One Link Away",
    description:
      "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediLink — Your Health, One Link Away",
    description:
      "AI-powered healthcare platform for Bangladesh connecting patients with medicine, doctors, and emergency services.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Makes env(safe-area-inset-*) non-zero so the mobile bottom navigation
  // clears the iOS home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang="en"` describes the UI chrome, which is English. Bangla content
    // (the AI replies, the suggested prompts, the error copy) tags itself
    // with lang="bn" so screen readers use the right phonetics and the
    // `:lang(bn)` CSS rule selects the Hind Siliguri typeface.
    <html
      lang="en"
      dir="ltr"
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${inter.variable} ${hindSiliguri.variable}`}
      // The inline script below adds the `js` class to <html> before React
      // hydrates. React would then compare the DOM (which has `js`) against
      // the server markup (which does not) and report a hydration mismatch on
      // every page. This attribute is React's documented escape hatch for
      // exactly this case.
      suppressHydrationWarning
    >
      <head>
        {/*
          Marks that JavaScript is alive. Scroll-reveal animations use
          `.js .reveal { opacity: 0 }`, so the hidden state only ever exists
          when JS can un-hide it. Crawlers and no-JS visitors always receive
          the content — previously the FAQ, the pricing table and the whole
          conversion banner shipped at `opacity: 0` in the static HTML.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body className="font-sans bg-bg-main text-text-primary antialiased min-h-screen selection:bg-brand-light selection:text-brand-dark">
        {children}
      </body>
    </html>
  );
}
