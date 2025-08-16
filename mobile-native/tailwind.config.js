const {
  colors: defaultColors,
  fontFamily: defaultFontFamily,
} = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...defaultColors,
        primary: "#FF5C00",
        secondary: "#F5F5F5",
        error: "#ef0f0f",
      },
      fontFamily: {
        ...defaultFontFamily,
        sans: ["Space Grotesk", ...defaultFontFamily.sans],
      },
    },
  },
  plugins: [],
};
