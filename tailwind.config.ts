
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
        // Legacy Cosmic Theme Colors (preserved for compatibility)
        cosmos: {
          cosmic: "#121624",
          nebula: "#9b87f5",
          stardust: "#8B5CF6",
          aurora: "#0EA5E9",
          nova: "#D946EF",
          solar: "#F97316",
        },
        // New Semantic Accent System
        "accent-blue": {
          50: "hsl(var(--accent-blue-50))",
          100: "hsl(var(--accent-blue-100))",
          500: "hsl(var(--accent-blue-500))",
          600: "hsl(var(--accent-blue-600))",
          900: "hsl(var(--accent-blue-900))",
        },
        "accent-pink": {
          50: "hsl(var(--accent-pink-50))",
          100: "hsl(var(--accent-pink-100))",
          500: "hsl(var(--accent-pink-500))",
          600: "hsl(var(--accent-pink-600))",
          900: "hsl(var(--accent-pink-900))",
        },
        "accent-orange": {
          50: "hsl(var(--accent-orange-50))",
          100: "hsl(var(--accent-orange-100))",
          500: "hsl(var(--accent-orange-500))",
          600: "hsl(var(--accent-orange-600))",
          900: "hsl(var(--accent-orange-900))",
        },
        "accent-purple": {
          50: "hsl(var(--accent-purple-50))",
          100: "hsl(var(--accent-purple-100))",
          500: "hsl(var(--accent-purple-500))",
          600: "hsl(var(--accent-purple-600))",
          900: "hsl(var(--accent-purple-900))",
        },
        "accent-green": {
          50: "hsl(var(--accent-green-50))",
          100: "hsl(var(--accent-green-100))",
          500: "hsl(var(--accent-green-500))",
          600: "hsl(var(--accent-green-600))",
          900: "hsl(var(--accent-green-900))",
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
        "twinkle": {
          "0%": { opacity: "0.3" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.3" },
        },
        "float": {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0px)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "scale": {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        // New micro-interaction keyframes
        "hover-lift": {
          "0%": { transform: "translateY(0px) scale(1)" },
          "100%": { transform: "translateY(-2px) scale(1.02)" },
        },
        "magnetic-pull": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1.02)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--accent) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.6)" },
        },
        "glass-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-out": "fade-out 0.5s ease-out",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "twinkle-slow": "twinkle 5s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse": "pulse 3s ease-in-out infinite",
        "scale": "scale 0.2s ease-out",
        // New micro-interaction animations
        "hover-lift": "hover-lift 0.2s ease-out",
        "magnetic-pull": "magnetic-pull 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
  ],
} satisfies Config;
