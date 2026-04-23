import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
