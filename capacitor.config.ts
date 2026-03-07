import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hgpoker.app",
  appName: "HG Poker",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
};

export default config;
