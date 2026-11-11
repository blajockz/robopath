// Lets phones install the game ("Add to Home Screen"). Opened that way it
// runs full screen and in landscape, including on iPhones.
export default function manifest() {
  return {
    name: "RoboPath Challenge",
    short_name: "RoboPath",
    description: "A programming puzzle by N7GD (Game Dev).",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#f1eaff",
    theme_color: "#ddd2ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
