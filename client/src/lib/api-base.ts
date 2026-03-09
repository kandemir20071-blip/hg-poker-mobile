import { Capacitor } from "@capacitor/core";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return API_BASE_URL;
  }
  return "";
}
