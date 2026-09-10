import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        ink: "#24262d",
        paper: "#fbfaf8",
        rose: "#ca7481",
        "rose-soft": "#f7e8e8",
        teal: "#4f998e",
        "teal-soft": "#e3f2ee",
        violet: "#817eb1",
        "violet-soft": "#ecebf6",
        amber: "#c7944e",
        "amber-soft": "#fbf1e3",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
    },
  },
};
