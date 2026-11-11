import os from "node:os";

const isDev = process.env.NODE_ENV !== "production";

// In dev mode ("npm run dev"), Next.js only lets the page's scripts run
// when the game is opened from this computer (localhost). Opened from a
// phone through the computer's network address, the page shows but no
// button works. Listing this computer's own addresses here fixes that.
// Add more with DEV_ORIGINS, for example: DEV_ORIGINS=mygame.example.com
const allowedDevOrigins = [
  ...Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && !address.internal)
    .map((address) => address.address),
  ...(process.env.DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

// Content Security Policy: the page may only load its own files.
// No other website can be contacted, embedded or used to load scripts.
// (Next.js needs inline scripts to start the page, and eval in dev mode only.)
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Other sites cannot show the game inside a frame (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers must not guess file types
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Do not tell other sites where visitors came from
  { key: "Referrer-Policy", value: "no-referrer" },
  // The game needs no camera, microphone, location, etc.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins,
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise which framework runs the site
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
