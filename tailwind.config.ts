import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /* ======================================================================
         COLORS
         ====================================================================== */

      colors: {
        /* --------------------------------------------------------------------
           Primary
           -------------------------------------------------------------------- */

        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },

        /* --------------------------------------------------------------------
           Secondary
           -------------------------------------------------------------------- */

        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },

        /* --------------------------------------------------------------------
           Accent
           -------------------------------------------------------------------- */

        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },

        /* --------------------------------------------------------------------
           Base / Background
           -------------------------------------------------------------------- */

        base: "var(--base)",

        background: "var(--background)",
        foreground: "var(--foreground)",

        /* --------------------------------------------------------------------
           Card
           -------------------------------------------------------------------- */

        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        /* --------------------------------------------------------------------
           Popover
           -------------------------------------------------------------------- */

        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },

        /* --------------------------------------------------------------------
           Muted
           -------------------------------------------------------------------- */

        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },

        /* --------------------------------------------------------------------
           Destructive
           -------------------------------------------------------------------- */

        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },

        /* --------------------------------------------------------------------
           Border / Input / Ring
           -------------------------------------------------------------------- */

        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        /* --------------------------------------------------------------------
           Chart
           -------------------------------------------------------------------- */

        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },

        /* --------------------------------------------------------------------
           Sidebar
           -------------------------------------------------------------------- */

        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",

          primary: "var(--sidebar-primary)",
          "primary-foreground":
            "var(--sidebar-primary-foreground)",

          accent: "var(--sidebar-accent)",
          "accent-foreground":
            "var(--sidebar-accent-foreground)",

          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },

        /* --------------------------------------------------------------------
           Semantic Status Colors
           -------------------------------------------------------------------- */

        status: {
          hadir: "var(--color-status-hadir)",
          terlambat: "var(--color-status-terlambat)",
          izin: "var(--color-status-izin)",
          sakit: "var(--color-status-sakit)",
          alpa: "var(--color-status-alpa)",
          pending: "var(--color-status-pending)",
          lolos: "var(--color-status-lolos)",
          tolak: "var(--color-status-tolak)",
          aktif: "var(--color-status-aktif)",
          nonaktif: "var(--color-status-nonaktif)",
        },
      },


      /* ======================================================================
         BORDER RADIUS
         ====================================================================== */

      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "24px",
        "3xl": "32px",
        pill: "9999px",
      },


      /* ======================================================================
         FONT FAMILY
         ====================================================================== */

      fontFamily: {
        sans: [
          "Nunito Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],

        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
      },


      /* ======================================================================
         FONT SIZE
         ====================================================================== */

      fontSize: {
        "2xs": [
          "10px",
          {
            lineHeight: "14px",
          },
        ],

        xs: [
          "12px",
          {
            lineHeight: "16px",
          },
        ],

        sm: [
          "14px",
          {
            lineHeight: "20px",
          },
        ],

        base: [
          "15px",
          {
            lineHeight: "22px",
          },
        ],

        lg: [
          "17px",
          {
            lineHeight: "26px",
          },
        ],

        xl: [
          "20px",
          {
            lineHeight: "28px",
          },
        ],

        "2xl": [
          "24px",
          {
            lineHeight: "32px",
          },
        ],

        "3xl": [
          "30px",
          {
            lineHeight: "38px",
          },
        ],

        "4xl": [
          "36px",
          {
            lineHeight: "44px",
          },
        ],
      },


      /* ======================================================================
         FONT WEIGHT
         ====================================================================== */

      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },


      /* ======================================================================
         BOX SHADOW
         ====================================================================== */

      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04)",

        elevated:
          "0 12px 30px rgba(0,0,0,0.08)",

        sm:
          "0 1px 3px rgba(0,0,0,0.06)",

        md:
          "0 4px 12px rgba(0,0,0,0.08)",

        lg:
          "0 8px 24px rgba(0,0,0,0.10)",

        xl:
          "0 16px 40px rgba(0,0,0,0.12)",
      },


      /* ======================================================================
         TRANSITION
         ====================================================================== */

      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },


      /* ======================================================================
         SPACING
         ====================================================================== */

      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
      },


      /* ======================================================================
         MAX WIDTH
         ====================================================================== */

      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },


      /* ======================================================================
         SCREENS
         ====================================================================== */

      screens: {
        xs: "480px",
      },


      /* ======================================================================
         KEYFRAMES
         ====================================================================== */

      keyframes: {
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(6px)",
          },

          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "slide-in-from-left": {
          from: {
            transform: "translateX(-100%)",
          },

          to: {
            transform: "translateX(0)",
          },
        },

        "zoom-in-95": {
          from: {
            opacity: "0",
            transform: "scale(0.95)",
          },

          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-468px 0",
          },

          "100%": {
            backgroundPosition: "468px 0",
          },
        },

        "progress-fill": {
          from: {
            width: "0%",
          },

          to: {
            width: "var(--progress-width, 0%)",
          },
        },
      },


      /* ======================================================================
         ANIMATION
         ====================================================================== */

      animation: {
        "fade-in":
          "fade-in 200ms ease-out both",

        "slide-in-from-left":
          "slide-in-from-left 200ms ease-out both",

        "zoom-in-95":
          "zoom-in-95 200ms ease-out both",

        shimmer:
          "shimmer 1.5s ease-in-out infinite",

        "progress-fill":
          "progress-fill 800ms ease-out both",
      },
    },
  },

  plugins: [],
};

export default config;