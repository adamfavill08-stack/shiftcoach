import { registerPlugin, WebPlugin } from "@capacitor/core";

export interface ShiftCoachHealthConnectPlugin {
  getStatus(): Promise<{
    available: boolean;
    sdkStatus: string;
    hasPermissions: boolean;
  }>;
  requestPermissions(): Promise<{ granted: boolean }>;
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

  async requestPermissions() {
    return { granted: false };
  }

  async syncNow() {
    throw new Error("Health Connect runs only on Android native");
  }
}

export const ShiftCoachHealthConnect = registerPlugin<ShiftCoachHealthConnectPlugin>(
  "ShiftCoachHealthConnect",
  {
    web: () => new ShiftCoachHealthConnectWeb(),
  },
);
