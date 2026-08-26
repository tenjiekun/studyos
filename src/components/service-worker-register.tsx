"use client";

import { useEffect, useRef } from "react";

// Current app version — bump this on every deploy to force cache clear
const APP_VERSION = "2.1.0";

export function ServiceWorkerRegister() {
  const registered = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (registered.current) return;
    registered.current = true;

    // Check if a new version is available
    const storedVersion = localStorage.getItem("studyos-app-version");
    if (storedVersion && storedVersion !== APP_VERSION) {
      // New deployment detected — clear all caches
      caches.keys().then((keys) => {
        Promise.all(keys.map((key) => caches.delete(key))).then(() => {
          localStorage.setItem("studyos-app-version", APP_VERSION);
          // Force reload to get fresh assets
          window.location.reload();
        });
      });
      return;
    }
    localStorage.setItem("studyos-app-version", APP_VERSION);

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every 60 seconds
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60000);

        // Listen for new service worker activation
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — skip waiting and reload
              newWorker.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch(() => {
        // SW registration failed — not critical, app still works
      });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  return null;
}
