// Light / dark mode and color theme, kept in this browser and applied to <html> before first paint.
export const MODES = ["light", "dark", "system"] as const;
export const PALETTES = ["indigo", "ocean", "forest", "sunset", "lavender"] as const;
export type Mode = (typeof MODES)[number];
export type Palette = (typeof PALETTES)[number];

// Swatch colors for the picker (the light accent and its partner).
export const SWATCHES: Record<Palette, [string, string]> = {
  indigo: ["#4f5bd5", "#0e8a7e"],
  ocean: ["#1f72c4", "#0e8a7e"],
  forest: ["#2e7a4d", "#8a6d1f"],
  sunset: ["#c4552f", "#b8336a"],
  lavender: ["#7448cc", "#2f86a8"],
};

// Runs inline in <head>: no flash of the wrong theme on load.
export const APPEARANCE_SCRIPT = `try{var d=document.documentElement,m=localStorage.getItem("mode"),p=localStorage.getItem("palette");if(m==="light"||m==="dark")d.dataset.theme=m;if(p&&p!=="indigo")d.dataset.palette=p}catch(e){}`;
