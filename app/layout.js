import localFont from "next/font/local";
import "./globals.css";

// Pixelify Sans, stored in the project (app/fonts) instead of being
// downloaded from Google: the game makes no request to any other site.
const pixelify = localFont({
  src: "./fonts/PixelifySans-latin.woff2",
  variable: "--font-pixel",
  weight: "400 700",
  display: "swap",
});

export const metadata = {
  title: "RoboPath Challenge | N7GD × N7SEC",
  description:
    "A programming puzzle by N7GD (Game Dev) and N7SEC (Security). Program the ghost with a few commands and collect every star.",
  applicationName: "RoboPath Challenge",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ddd2ff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={pixelify.variable}>
      <body>{children}</body>
    </html>
  );
}
