"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { maybeRequestInAppReview } from "@/lib/inAppReview/inAppReviewSchedule";
import { isAndroidNative, ShiftCoachAppReview } from "@/lib/native/shiftCoachAppReview";

/**
 * Google Play In-App Review (native Android). Equivalent goal to Flutter `in_app_review`.
 * First prompt after 7 days from first app open, then every 7 days after last successful native call.
 */
export function InAppReviewScheduler() {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isAndroidNative()) return;

    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await maybeRequestInAppReview(() => ShiftCoachAppReview.requestReview());
      } finally {
        inFlight.current = false;
      }
    };

    void run();

    let remove: (() => void) | undefined;
    const sub = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void run();
    });
    void sub.then((handle) => {
      remove = () => handle.remove();
    });

    return () => {
      remove?.();
    };
  }, []);

  return null;
}
