import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.socloudy",
  appName: "socloudy",
  webDir: "dist",
  plugins: {
    // Don't resize the webview when the keyboard shows, so the fixed bottom tab
    // bar stays put (the text inputs live near the top, so they aren't hidden).
    Keyboard: {
      resize: "none",
    },
  },
};

export default config;
