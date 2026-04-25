import { registerPlugin, WebPlugin } from "@capacitor/core";

export interface ShiftCoachHealthConnectPlugin {
  getStatus(): Promise<{
    available: boolean;
    sdkStatus: string;
    hasPermissions: boolean;
  }>;
  /** Health Connect data access (not Capacitor manifest permissions). */
  requestConnectPermissions(): Promise<{ granted: boolean }>;
  syncNow(): Promise<{
    ok: boolean;
    lastSyncedAt?: string;
    steps?: number;
    sleepCount?: number;
    heartRateCount?: number;
  }>;
}

class ShiftCoachHealthConnectWeb extends WebPlugin implements ShiftCoachHealthConnectPlugin {
  async getStatus() {
    return { available: false, sdkStatus: "web", hasPermissions: false };
  }

  async requestConnectPermissions() {
    return { granted: false };
  }

  async syncNow() {
    return { ok: false };
  }
}

export const ShiftCoachHealthConnect = registerPlugin<ShiftCoachHealthConnectPlugin>(
  "ShiftCoachHealthConnect",
  {
    web: () => new ShiftCoachHealthConnectWeb(),
  },
);
