// Light / dark mode and color theme, kept in this browser and applied to <html> before first paint.
export const MODES = ["light", "dark", "system"] as const;
export const PALETTES = ["tag", "indigo", "ocean", "forest", "sunset", "lavender"] as const;
export type Mode = (typeof MODES)[number];
export type Palette = (typeof PALETTES)[number];

// Swatch colors for the picker (the light accent and its partner).
export const SWATCHES: Record<Palette, [string, string]> = {
  tag: ["#c2410c", "#0e8a7e"],
  indigo: ["#4f5bd5", "#0e8a7e"],
  ocean: ["#1f72c4", "#0e8a7e"],
  forest: ["#2e7a4d", "#8a6d1f"],
  sunset: ["#c4552f", "#b8336a"],
  lavender: ["#7448cc", "#2f86a8"],
};

// Stored under "color" since the price-tag default arrived; the old "palette" key (indigo era) is ignored on purpose.
export const PALETTE_KEY = "color";

// Runs inline in <head>: no flash of the wrong theme on load.
export const APPEARANCE_SCRIPT = `try{var d=document.documentElement,m=localStorage.getItem("mode"),p=localStorage.getItem("color");if(m==="light"||m==="dark")d.dataset.theme=m;if(p&&p!=="tag")d.dataset.palette=p}catch(e){}`;
