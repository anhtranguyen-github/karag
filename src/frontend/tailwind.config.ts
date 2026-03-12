import plugin from "tailwindcss/plugin";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      colors: {

        "surface-variant": "#2f3544",
        "error": "#ffb4ab",
        "secondary-fixed": "#d3e4fe",
        "tertiary-container": "#df7412",
        "surface-container-high": "#242a39",
        "on-tertiary-fixed": "#311400",
        "on-error": "#690005",
        "primary-container": "#4d8eff",
        "inverse-surface": "#dde2f6",
        "on-secondary-container": "#a9bad3",
        "outline-variant": "#424754",
        "on-surface": "#dde2f6",
        "secondary-fixed-dim": "#b7c8e1",
        "tertiary": "#ffb786",
        "inverse-primary": "#005ac2",
        "on-tertiary": "#502400",
        "surface": "#0d1321",
        "on-tertiary-fixed-variant": "#723600",
        "primary-fixed-dim": "#adc6ff",
        "outline": "#8c909f",
        "tertiary-fixed-dim": "#ffb786",
        "on-tertiary-container": "#461f00",
        "tertiary-fixed": "#ffdcc6",
        "on-primary-container": "#00285d",
        "secondary-container": "#3a4a5f",
        "surface-container-lowest": "#080e1c",
        "on-primary-fixed": "#001a42",
        "on-surface-variant": "#c2c6d6",
        "surface-container": "#191f2e",
        "on-primary": "#002e6a",
        "surface-container-low": "#151b29",
        "surface-dim": "#0d1321",
        "on-secondary-fixed": "#0b1c30",
        "surface-container-highest": "#2f3544",
        "surface-bright": "#333948",
        "on-background": "#dde2f6",
        "error-container": "#93000a",
        "on-secondary": "#213145",
        "on-primary-fixed-variant": "#004395",
        "surface-tint": "#adc6ff",
        "on-error-container": "#ffdad6",
        "primary-fixed": "#d8e2ff",
        "on-secondary-fixed-variant": "#38485d",
        "inverse-on-surface": "#2a303f",

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {

        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],

        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out"
      }
    }
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".animate-in": {
          animationDuration: "150ms",
          animationFillMode: "both",
          animationTimingFunction: "ease-out"
        },
        ".fade-in": {
          "--tw-enter-opacity": "0",
          opacity: "1",
          animationName: "enter-opacity"
        },
        ".zoom-in-95": {
          "--tw-enter-scale": ".95",
          transform: "scale(1)",
          animationName: "enter-scale"
        },
        ".slide-in-from-top-1": {
          "--tw-enter-translate-y": "-0.25rem",
          transform: "translateY(0)",
          animationName: "enter-translate"
        },
        ".slide-in-from-bottom-2": {
          "--tw-enter-translate-y": "0.5rem",
          transform: "translateY(0)",
          animationName: "enter-translate"
        },
        ".slide-in-from-bottom-4": {
          "--tw-enter-translate-y": "1rem",
          transform: "translateY(0)",
          animationName: "enter-translate"
        },
        ".slide-in-from-bottom-8": {
          "--tw-enter-translate-y": "2rem",
          transform: "translateY(0)",
          animationName: "enter-translate"
        },
        "@keyframes enter-opacity": {
          from: { opacity: "var(--tw-enter-opacity, 1)" },
          to: { opacity: "1" }
        },
        "@keyframes enter-scale": {
          from: { transform: "scale(var(--tw-enter-scale, 1))" },
          to: { transform: "scale(1)" }
        },
        "@keyframes enter-translate": {
          from: { transform: "translateY(var(--tw-enter-translate-y, 0))" },
          to: { transform: "translateY(0)" }
        }
      });
    })
  ]
};

export default config;
