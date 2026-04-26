import { registerPlugin, WebPlugin } from "@capacitor/core";

export interface ShiftCoachHealthConnectPlugin {
  getStatus(): Promise<{
    available: boolean;
    sdkStatus: string;
    sdkStatusDefault?: string;
    sdkStatusProvider?: string;
    defaultProviderPackageName?: string;
    androidSdkInt?: number;
    extensionVersion?: number | null;
    canCreateClient?: boolean;
    clientCreateError?: string | null;
    grantedPermissions?: string[];
    requiredPermissions?: string[];
    missingPermissions?: string[];
    packageName?: string;
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
    return {
      available: false,
      sdkStatus: "web",
      sdkStatusDefault: "web",
      sdkStatusProvider: "web",
      defaultProviderPackageName: undefined,
      androidSdkInt: undefined,
      extensionVersion: null,
      canCreateClient: false,
      clientCreateError: null,
      grantedPermissions: [],
      requiredPermissions: [],
      missingPermissions: [],
      packageName: undefined,
      hasPermissions: false,
    };
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
