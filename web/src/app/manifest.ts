import type { MetadataRoute } from "next";
import en from "@/i18n/dictionaries/en";

// Lets phones install the site, and puts it in shop apps' Share menu: sharing a product opens /add.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: en.meta.title,
    short_name: en.meta.title,
    description: en.meta.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/add",
      method: "GET",
      params: { url: "url", text: "text", title: "title" },
    },
  };
}
