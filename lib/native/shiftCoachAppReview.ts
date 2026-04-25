import { Capacitor, registerPlugin, WebPlugin } from "@capacitor/core";

export interface ShiftCoachAppReviewPlugin {
  requestReview(): Promise<{ requested: boolean; launchSuccess?: boolean }>;
}

class ShiftCoachAppReviewWeb extends WebPlugin implements ShiftCoachAppReviewPlugin {
  async requestReview() {
    return { requested: false, launchSuccess: false };
  }
}

export const ShiftCoachAppReview = registerPlugin<ShiftCoachAppReviewPlugin>(
  "ShiftCoachAppReview",
  {
    web: () => new ShiftCoachAppReviewWeb(),
  },
);

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
