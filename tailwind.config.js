/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // 像素風字體之後可替換；先用等寬字營造復古感
        pixel: ["'Courier New'", "monospace"],
      },
      colors: {
        sea: "#0e2a3b",
        deck: "#1b3a4b",
        steel: "#3d5a6c",
        amber: "#ffb347",
      },
    },
  },
  plugins: [],
};
