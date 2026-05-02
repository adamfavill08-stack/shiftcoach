import { registerPlugin, WebPlugin } from "@capacitor/core";

/** Present only on debug Android builds (HC_VERBOSE_LOG); permission metadata only — no health samples. */
export type HcDiagnostics = {
  appVersionName?: string | null;
  appVersionCode?: number;
  packageName?: string;
  permissionLauncherRegistered?: boolean;
  lastPermissionLaunchMs?: number;
  lastPermissionCallbackMs?: number;
  sdkStatus?: string;
  requiredPermissionsCount?: number;
  grantedPermissionsCount?: number;
  grantedPermissionsSnapshot?: string;
  missingPermissionsCount?: number;
  launchCalled?: boolean;
  callbackFired?: boolean;
  lastNativeError?: string | null;
};

/** Always returned from native getStatus: MainActivity-owned launcher + activity wiring (debug builds add hcDiagnostics too). */
export type HcLauncherDiagnostics = {
  sdkStatus?: string;
  packageName?: string;
  activityClass?: string | null;
  activityIsFragmentActivity?: boolean;
  activityIsComponentActivity?: boolean;
  launcherRegistered?: boolean;
  lastPermissionLaunchMs?: number;
  lastPermissionCallbackMs?: number;
  launchCalled?: boolean;
  callbackFired?: boolean;
  lastRegistrationError?: string | null;
  lastLaunchError?: string | null;
  lastNativeError?: string | null;
  grantedPermissions?: string[];
  missingPermissions?: string[];
};

export interface ShiftCoachHealthConnectPlugin {
  getStatus(): Promise<{
    available: boolean;
    /** False if the Activity never registered the HC permission launcher (native wiring bug). */
    permissionFlowReady?: boolean;
    hcDiagnostics?: HcDiagnostics;
    hcLauncherDiagnostics?: HcLauncherDiagnostics;
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
  /**
   * Android: read Supabase session from WebView `localStorage` and store the access token in native memory
   * for the next `/api/health-connect/sync` POST. **No arguments** — avoids JWT in Capacitor `methodData` logs.
   */
  pullAuthFromWebSession(): Promise<{ tokenPresent: boolean }>;
  /** Android: clear in-memory bearer used for Health Connect sync (call on sign-out). */
  clearNativeHealthConnectAuth(): Promise<void>;
  syncNow(): Promise<{
    ok: boolean;
    lastSyncedAt?: string;
    steps?: number;
    sleepCount?: number;
    heartRateCount?: number;
    /** True when the read window returned no steps, sleep sessions, or heart-rate samples (writers may be missing). */
    recentDataLikelyEmpty?: boolean;
  }>;
}

class ShiftCoachHealthConnectWeb extends WebPlugin implements ShiftCoachHealthConnectPlugin {
  async getStatus() {
    return {
      available: false,
      permissionFlowReady: false,
      hcLauncherDiagnostics: undefined,
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

  async pullAuthFromWebSession() {
    return { tokenPresent: false };
  }

  async clearNativeHealthConnectAuth() {
    return;
  }

  async syncNow() {
    return { ok: false, recentDataLikelyEmpty: false };
  }
}

export const ShiftCoachHealthConnect = registerPlugin<ShiftCoachHealthConnectPlugin>(
  "ShiftCoachHealthConnect",
  {
    web: () => new ShiftCoachHealthConnectWeb(),
  },
);
