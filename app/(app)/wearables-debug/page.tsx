"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/providers/language-provider";

type DebugPayload = {
  raw?: any;
  activity?: any;
  sleepOverview?: any;
  heartRate?: any;
  errors?: Record<string, string>;
};

export default function WearablesDebugPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const errors: Record<string, string> = {};

      const [rawRes, activityRes, sleepRes, hrRes] = await Promise.all([
        fetch("/api/wearables/debug").catch(() => null),
        fetch("/api/activity/today").catch(() => null),
        fetch("/api/sleep/overview").catch(() => null),
        fetch("/api/wearables/heart-rate").catch(() => null),
      ]);

      const raw = rawRes ? await rawRes.json().catch(() => null) : null;
      const activity = activityRes ? await activityRes.json().catch(() => null) : null;
      const sleepOverview = sleepRes ? await sleepRes.json().catch(() => null) : null;
      const heartRate = hrRes ? await hrRes.json().catch(() => null) : null;

      if (!rawRes?.ok) errors.raw = `wearables/debug ${rawRes?.status ?? "network_error"}`;
      if (!activityRes?.ok) errors.activity = `activity/today ${activityRes?.status ?? "network_error"}`;
      if (!sleepRes?.ok) errors.sleepOverview = `sleep/overview ${sleepRes?.status ?? "network_error"}`;
      if (!hrRes?.ok) errors.heartRate = `wearables/heart-rate ${hrRes?.status ?? "network_error"}`;

      setData({
        raw,
        activity,
        sleepOverview,
        heartRate,
        errors,
      });
      setLoading(false);
    };

    void run();
  }, []);

  return (
    <main className="max-w-[900px] mx-auto px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("detail.wearablesDebug.title")}</h1>
        <Link href="/wearables-setup" className="text-sm underline">
          {t("detail.wearablesDebug.backLink")}
        </Link>
      </div>

      {loading && <p className="text-sm opacity-70">{t("detail.wearablesDebug.loading")}</p>}

      {!loading && (
        <>
          {data?.errors && Object.keys(data.errors).length > 0 && (
            <section className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm">
              <p className="font-semibold mb-1">{t("detail.wearablesDebug.endpointErrors")}</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(data.errors, null, 2)}</pre>
            </section>
          )}

          <section className="rounded-lg border p-3">
            <p className="font-semibold mb-2">{t("detail.wearablesDebug.sectionRawDb")}</p>
            <pre className="text-xs overflow-auto">{JSON.stringify(data?.raw, null, 2)}</pre>
          </section>

          <section className="rounded-lg border p-3">
            <p className="font-semibold mb-2">{t("detail.wearablesDebug.sectionActivityToday")}</p>
            <pre className="text-xs overflow-auto">{JSON.stringify(data?.activity, null, 2)}</pre>
          </section>

          <section className="rounded-lg border p-3">
            <p className="font-semibold mb-2">{t("detail.wearablesDebug.sectionSleepOverview")}</p>
            <pre className="text-xs overflow-auto">{JSON.stringify(data?.sleepOverview, null, 2)}</pre>
          </section>

          <section className="rounded-lg border p-3">
            <p className="font-semibold mb-2">{t("detail.wearablesDebug.sectionHeartRate")}</p>
            <pre className="text-xs overflow-auto">{JSON.stringify(data?.heartRate, null, 2)}</pre>
          </section>
        </>
      )}
    </main>
  );
}
