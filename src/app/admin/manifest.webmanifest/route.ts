// The admin as a home-screen app (§9.17): name, start URL /admin/today, standalone, the logo mark as icon.
// No service worker and no offline mode. Colours: the site paper and ink (the shared palette; tokens.css has them).
import C from "@/lib/mail/palette.json";

export function GET() {
  return Response.json(
    {
      name: "Baked by Linda admin",
      short_name: "BbL admin",
      start_url: "/admin/today",
      scope: "/admin/",
      display: "standalone",
      background_color: C.buttonText,
      theme_color: C.ink,
      icons: [
        {
          src: "/brand/admin-icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/brand/admin-icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
