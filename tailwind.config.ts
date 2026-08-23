
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Legacy font
        poppins: ['Poppins', 'sans-serif'],
        // New design system fonts
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Semantic accent system. Only the steps the themes consume.
        "accent-blue": {
          500: "hsl(var(--accent-blue-500))",
          600: "hsl(var(--accent-blue-600))",
        },
        "accent-pink": {
          500: "hsl(var(--accent-pink-500))",
          600: "hsl(var(--accent-pink-600))",
        },
        "accent-orange": {
          500: "hsl(var(--accent-orange-500))",
          600: "hsl(var(--accent-orange-600))",
        },
        "accent-purple": {
          500: "hsl(var(--accent-purple-500))",
          600: "hsl(var(--accent-purple-600))",
        },
        "accent-green": {
          500: "hsl(var(--accent-green-500))",
          600: "hsl(var(--accent-green-600))",
        },
        // Status colors. Never the only signal for a state.
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Surface roles. See DOCS/DESIGN-SYSTEM.md.
        surface: {
          app: "hsl(var(--surface-app))",
          sidebar: "hsl(var(--surface-sidebar))",
          toolbar: "hsl(var(--surface-toolbar))",
          content: "hsl(var(--surface-content))",
          elevated: "hsl(var(--surface-elevated))",
          input: "hsl(var(--surface-input))",
          pinboard: "hsl(var(--surface-pinboard))",
          border: "hsl(var(--surface-border))",
          "border-strong": "hsl(var(--surface-border-strong))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "slide-down": "slide-down 0.2s ease-out",
      },
      width: {
        sidebar: "var(--app-sidebar-width)",
        "sidebar-collapsed": "var(--app-sidebar-width-collapsed)",
      },
      spacing: {
        sidebar: "var(--app-sidebar-width)",
        "sidebar-collapsed": "var(--app-sidebar-width-collapsed)",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
  ],
} satisfies Config;
