import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foodle",
    short_name: "Foodle",
    description: "Restaurant POS, ordering and bookings",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c0a09",
    theme_color: "#c2410c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
