/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1a1464",
        cyan: "#12b8e8",
        bg: "#f7f8fb",
        border: "#e6e8f0",
        textp: "#1a1a2e",
        texts: "#6b6f8a",
        durum: {
          baslatildi: "#8a8fa8",
          rezervasyon: "#f2994a",
          grafik: "#2f80ed",
          metro: "#9b51e0",
          tamamlandi: "#27ae60",
          revize: "#eb5757",
          iptal: "#4b4b4b",
        },
      },
    },
  },
  plugins: [],
};
