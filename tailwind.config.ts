import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Tailwind's runtime accepts a function for a colour value (that is exactly
 * how the `<alpha-value>` composition works), but the published `Config`
 * type only declares plain strings. These aliases document that gap rather
 * than hiding it behind `any`.
 */
type ThemeExtend = NonNullable<NonNullable<Config["theme"]>["extend"]>;
type ColorScale = ThemeExtend["colors"];

/**
 * Emits a colour utility that supports Tailwind's opacity modifier.
 *
 * Tailwind v3 can only alpha-compose a colour whose definition contains
 * the `<alpha-value>` placeholder. A bare `var(--brand)` string cannot be
 * parsed, so Tailwind DROPS the whole utility — `bg-brand/10` emits no
 * CSS at all and silently renders nothing.
 *
 * By storing colours as RGB channel triplets (`--brand-rgb: 23 120 111`)
 * we can compose alpha ourselves:
 *
 *   bg-brand     ->  rgb(var(--brand-rgb))
 *   bg-brand/10  ->  rgb(var(--brand-rgb) / 0.1)
 *
 * `opacityValue` is only supplied by Tailwind when a `/NN` modifier is
 * present, which is exactly the signal we need.
 */
const token = (name: string) =>
  ({ opacityValue }: { opacityValue?: string }): string =>
    opacityValue === undefined
      ? `rgb(var(--${name}-rgb))`
      : `rgb(var(--${name}-rgb) / ${opacityValue})`;

const colors = {
  "bg-main": token("bg-main"),
  "bg-soft": token("bg-soft"),
  "bg-mint": token("bg-mint"),
  "text-primary": token("text-primary"),
  "text-muted": token("text-muted"),
  "text-inverse": token("text-inverse"),
  brand: {
    DEFAULT: token("brand"),
    dark: token("brand-dark"),
    light: token("brand-light"),
    soft: token("brand-soft"),
  },
  hero: {
    from: token("hero-from"),
    to: token("hero-to"),
  },
  accent: {
    DEFAULT: token("accent"),
    soft: token("accent-soft"),
  },
  emergency: {
    DEFAULT: token("emergency"),
    soft: token("emergency-soft"),
    dark: "#B42318",
  },
  success: {
    DEFAULT: token("success"),
    soft: token("success-soft"),
    dark: "#0F7A38",
  },
  border: {
    DEFAULT: token("border"),
    soft: token("border-soft"),
  },
  whatsapp: {
    DEFAULT: token("whatsapp"),
    soft: token("whatsapp-soft"),
    dark: "#1DA851",
  },
} as unknown as ColorScale;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors,
      fontFamily: {
        heading: ["var(--font-head)", "Montserrat", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        bengali: ["var(--font-bengali)", "Hind Siliguri", "system-ui", "sans-serif"],
      },
      spacing: {
        "4.5": "1.125rem",
        "18": "4.5rem",
        "22": "5.5rem",
        // iOS safe-area inset for the fixed mobile bottom navigation.
        "safe": "env(safe-area-inset-bottom)",
      },
      borderRadius: {
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "20px",
        "2xl": "24px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(26, 43, 76, 0.06)",
        "2xs": "0 1px 1px rgba(26, 43, 76, 0.05)",
        sm: "0 1px 3px rgba(26, 43, 76, 0.08), 0 1px 2px rgba(26, 43, 76, 0.04)",
        md: "0 4px 6px -1px rgba(26, 43, 76, 0.1), 0 2px 4px -2px rgba(26, 43, 76, 0.06)",
        lg: "0 10px 15px -3px rgba(26, 43, 76, 0.1), 0 4px 6px -4px rgba(26, 43, 76, 0.05)",
      },
      // Durations that were used in components but are not in Tailwind's
      // default scale — without these they silently fell back to 150ms.
      transitionDuration: {
        "160": "160ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
      },
      scale: {
        "115": "1.15",
      },
      zIndex: {
        "40": "40", // mobile bottom nav
        "50": "50", // navbar
        "60": "60", // drawers
        "70": "70", // modals
        "80": "80", // toasts
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sosPulse: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(217, 45, 32, 0.5)" },
          "50%": { transform: "scale(1.04)", boxShadow: "0 0 0 16px rgba(217, 45, 32, 0)" },
        },
        skeletonShimmer: {
          "0%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0 50%" },
        },
        modalRise: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        drawerSlide: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        sheetSlide: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        toastRise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        riseIn: "riseIn 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        sosPulse: "sosPulse 2.4s infinite",
        skeleton: "skeletonShimmer 1.4s ease infinite",
        modalRise: "modalRise 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        drawerSlide: "drawerSlide 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        sheetSlide: "sheetSlide 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        toastRise: "toastRise 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        fadeIn: "fadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".scrollbar-none": {
          "-ms-overflow-style": "none",
          "scrollbarWidth": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    }),
  ],
};

export default config;
