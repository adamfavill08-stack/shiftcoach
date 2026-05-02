import { registerPlugin, WebPlugin } from "@capacitor/core";

export interface ShiftCoachHealthConnectPlugin {
  getStatus(): Promise<{
    available: boolean;
    /** False if the Activity never registered the HC permission launcher (native wiring bug). */
    permissionFlowReady?: boolean;
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
  requestConnectPermissions(): Promise<{
    granted: boolean;
    sdkUnavailable?: boolean;
    permissionResult?: "all_granted" | "none_granted" | "partial" | "sdk_unavailable";
    activityResultGrantedCount?: number;
    grantedPermissions?: string[];
    missingPermissions?: string[];
    requiredPermissions?: string[];
  }>;
  /** Android: Health Connect permission UI for this app (or app details in Settings). */
  openPermissionSettings(): Promise<void>;
  /** Android: Google Play listing for the Health Connect app (install / update). */
  openHealthConnectInstallPage(): Promise<void>;
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
      permissionFlowReady: false,
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
    return {
      granted: false,
      permissionResult: "none_granted" as const,
      grantedPermissions: [] as string[],
      missingPermissions: [] as string[],
      requiredPermissions: [] as string[],
    };
  }

  async openPermissionSettings() {
    return;
  }

  async openHealthConnectInstallPage() {
    return;
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
