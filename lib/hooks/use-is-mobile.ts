"use client";

import { useSyncExternalStore } from "react";

/** Detect mobile viewport via matchMedia (SSR-safe). */
const mobileSubscribe = (cb: () => void) => {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const mobileSnapshot = () => window.matchMedia("(max-width: 639px)").matches;
const mobileServerSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(mobileSubscribe, mobileSnapshot, mobileServerSnapshot);
}
