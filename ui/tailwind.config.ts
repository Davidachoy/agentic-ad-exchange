import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        atlas: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        "atlas-mono": ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        exchange: {
          bg: "#0b0f19",
          card: "#111827",
          accent: "#53d2dc",
          warn: "#e94560",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
