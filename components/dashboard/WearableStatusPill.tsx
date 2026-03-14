"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
 * Pill under body clock: white "Tap to connect" by default, green when connected,
 * red with reason when connection failed. Uses real status so desktop doesn't show false "connected".
 */
export function WearableStatusPill() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);

  const errorParam = searchParams.get("googleFitError");
  const errorKey = errorParam ? ERROR_TO_KEY[errorParam] ?? "errorGeneric" : null;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wearables/status");
      const data = await res.json().catch(() => ({}));
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
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

  // Red: connection failed (from OAuth callback redirect)
  if (errorKey) {
    return (
      <Link
        href="/wearables-setup"
        className="inline-flex flex-col items-center gap-1 rounded-full border-2 border-red-400 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300"
        aria-label={t("dashboard.wearable.errorGeneric")}
      >
        <span className="inline-flex items-center gap-2">
          <Watch className="h-4 w-4 flex-shrink-0" aria-hidden />
          <span>{t(`dashboard.wearable.${errorKey}`)}</span>
        </span>
        <span className="text-xs font-medium opacity-90">{t("dashboard.wearable.tapToConnect")}</span>
      </Link>
    );
  }

  // Green: connected
  if (connected === true) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
        role="status"
        aria-label={t("dashboard.wearable.connected")}
      >
        <Watch className="h-4 w-4 flex-shrink-0" aria-hidden />
        <span>{t("dashboard.wearable.connected")}</span>
      </div>
    );
  }

  // White: tap to connect — same in all themes (white pill, dark text/icon) so it acts the same everywhere
  return (
    <Link
      href="/wearables-setup"
      className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        color: "#1e293b",
      }}
      aria-label={t("dashboard.wearable.tapToConnect")}
    >
      <Watch className="h-4 w-4 flex-shrink-0" style={{ color: "#1e293b" }} aria-hidden />
      <span>{t("dashboard.wearable.tapToConnect")}</span>
    </Link>
  );
}
