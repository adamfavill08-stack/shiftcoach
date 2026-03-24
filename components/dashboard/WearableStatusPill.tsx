"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Watch } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

const ERROR_TO_KEY: Record<string, string> = {
  access_denied: "errorDenied",
  server_not_configured: "errorServer",
  redirect_uri_mismatch: "errorRedirect",
  token_exchange_failed: "errorToken",
  no_access_token: "errorGeneric",
  missing_code: "errorGeneric",
  unexpected: "errorGeneric",
};

/**
 * Pill under body clock: tap to open setup (or sync if already connected).
 * White by default, green when connected, red on error. Tapping runs sync or redirects to connect.
 */
export function WearableStatusPill() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced">("idle");

  const errorParam = searchParams.get("googleFitError");
  const errorKey = errorParam ? ERROR_TO_KEY[errorParam] ?? "errorGeneric" : null;

  const fetchStatus = useCallback(async () => {
    try {
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const url = `/api/wearables/status?startTimeMillis=${startTimeMillis}&endTimeMillis=${now}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      setConnected(!!data.connected);
      setStepsToday(typeof data.stepsToday === "number" ? data.stepsToday : null);
    } catch {
      setConnected(false);
      setStepsToday(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const onFocus = () => fetchStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchStatus]);

  const handleSync = useCallback(async () => {
    setSyncState("syncing");
    try {
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const res = await fetch("/api/wearables/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTimeMillis, endTimeMillis: now }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.error === "no_wearable_connection") {
        window.location.href = "/wearables-setup";
        return;
      }

      if (!res.ok) {
        setSyncState("idle");
        return;
      }

      const ts = data.lastSyncedAt ? new Date(data.lastSyncedAt).getTime() : Date.now();
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("wearables:lastSyncedAt", String(ts));
      }
      try {
        window.dispatchEvent(new CustomEvent("wearables-synced", { detail: { ts } }));
      } catch {
        // ignore
      }

      setSyncState("synced");
      fetchStatus();
      setTimeout(() => setSyncState("idle"), 3000);
    } catch {
      setSyncState("idle");
    }
  }, [fetchStatus]);

  // Hidden when connection failed.
  if (errorKey) return null;

  // Green: connected — tap to sync; show steps today when verified for concrete confirmation
  if (connected === true) {
    const label =
      syncState === "syncing"
        ? t("dashboard.wearable.syncing")
        : syncState === "synced"
          ? t("dashboard.wearable.synced")
          : stepsToday != null
            ? `${t("dashboard.wearable.connected")} • ${stepsToday.toLocaleString()} steps`
            : t("dashboard.wearable.connected");
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={syncState === "syncing"}
        className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 hover:opacity-90 disabled:opacity-70 transition-opacity"
        aria-label={label}
      >
        <Watch className="h-4 w-4 flex-shrink-0" aria-hidden />
        <span>{label}</span>
      </button>
    );
  }

  // Hidden until a wearable connection is established.
  return null;
}
