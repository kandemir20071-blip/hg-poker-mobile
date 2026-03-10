import { Capacitor } from "@capacitor/core";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    if (!API_BASE_URL) {
      console.error(
        "VITE_API_BASE_URL is not set. Native builds require this env var " +
        "to point to the production backend (e.g. https://your-app.replit.app)."
      );
    }
    return API_BASE_URL;
  }
  return "";
}
