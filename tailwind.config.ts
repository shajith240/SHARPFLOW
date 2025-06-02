import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        // Fluid typography system
        "fluid-xs": "clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)",
        "fluid-sm": "clamp(0.875rem, 0.8rem + 0.375vw, 1rem)",
        "fluid-base": "clamp(1rem, 0.9rem + 0.5vw, 1.125rem)",
        "fluid-lg": "clamp(1.125rem, 1rem + 0.625vw, 1.25rem)",
        "fluid-xl": "clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)",
        "fluid-2xl": "clamp(1.5rem, 1.3rem + 1vw, 1.875rem)",
        "fluid-3xl": "clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)",
        "fluid-4xl": "clamp(2.25rem, 1.9rem + 1.75vw, 3rem)",
        "fluid-5xl": "clamp(3rem, 2.5rem + 2.5vw, 4rem)",
        "fluid-6xl": "clamp(3.75rem, 3.25rem + 2.5vw, 5rem)",
      },
      spacing: {
        // Fluid spacing system
        "fluid-1": "clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem)",
        "fluid-2": "clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)",
        "fluid-3": "clamp(0.75rem, 0.6rem + 0.75vw, 1rem)",
        "fluid-4": "clamp(1rem, 0.8rem + 1vw, 1.5rem)",
        "fluid-6": "clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)",
        "fluid-8": "clamp(2rem, 1.6rem + 2vw, 3rem)",
        "fluid-12": "clamp(3rem, 2.4rem + 3vw, 4.5rem)",
        "fluid-16": "clamp(4rem, 3.2rem + 4vw, 6rem)",
        "fluid-24": "clamp(6rem, 4.8rem + 6vw, 9rem)",
      },
      screens: {
        xs: "480px",
        // Keep default Tailwind breakpoints
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
        dashboard: {
          primary: "hsl(var(--dashboard-primary))",
          secondary: "hsl(var(--dashboard-secondary))",
          bg: {
            primary: "hsl(var(--dashboard-bg-primary))",
            secondary: "hsl(var(--dashboard-bg-secondary))",
            tertiary: "hsl(var(--dashboard-bg-tertiary))",
            accent: "hsl(var(--dashboard-bg-accent))",
          },
          text: {
            primary: "hsl(var(--dashboard-text-primary))",
            secondary: "hsl(var(--dashboard-text-secondary))",
            muted: "hsl(var(--dashboard-text-muted))",
            accent: "hsl(var(--dashboard-text-accent))",
          },
          border: {
            primary: "hsl(var(--dashboard-border-primary))",
            secondary: "hsl(var(--dashboard-border-secondary))",
          },
          surface: {
            glass: "hsl(var(--dashboard-surface-glass))",
            elevated: "hsl(var(--dashboard-surface-elevated))",
          },
          status: {
            success: "hsl(var(--dashboard-success))",
            warning: "hsl(var(--dashboard-warning))",
            error: "hsl(var(--dashboard-error))",
            info: "hsl(var(--dashboard-info))",
          },
          interactive: {
            hover: "hsl(var(--dashboard-hover))",
            active: "hsl(var(--dashboard-active))",
            focus: "hsl(var(--dashboard-focus))",
          },
        },
        settings: {
          section: "hsl(var(--settings-section-bg))",
          input: "hsl(var(--settings-input-bg))",
          divider: "hsl(var(--settings-divider))",
          danger: "hsl(var(--settings-danger))",
          "danger-hover": "hsl(var(--settings-danger-hover))",
          success: "hsl(var(--settings-success))",
          warning: "hsl(var(--settings-warning))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
