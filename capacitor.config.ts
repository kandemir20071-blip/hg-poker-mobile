import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hgpoker.tracker",
  appName: "HG Poker",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  plugins: {
    App: {
      url: "hgpoker://",
    },
  },
};

export default config;
