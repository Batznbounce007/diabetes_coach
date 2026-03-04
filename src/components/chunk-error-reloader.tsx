"use client";

import { useEffect } from "react";

const RELOAD_GUARD_KEY = "chunk-reload-once";

function shouldHandleChunkError(error: unknown): boolean {
  if (!error) return false;
  const text = String(error);
  return text.includes("ChunkLoadError") || text.includes("Loading chunk");
}

export function ChunkErrorReloader() {
  useEffect(() => {
    function triggerReload() {
      if (typeof window === "undefined") return;
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      if (shouldHandleChunkError(event.error || event.message)) {
        triggerReload();
      }
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (shouldHandleChunkError(event.reason)) {
        triggerReload();
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

