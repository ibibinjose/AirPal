import { describe, expect, it, vi, beforeEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { hideNativeSplash, initNativeApp, syncNativeChrome, triggerHaptic, triggerHapticSelection } from "./native";
import { setThemePreference } from "./theme";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: {
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: "LIGHT",
    Medium: "MEDIUM",
    Heavy: "HEAVY",
  },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
  },
  Style: {
    Light: "LIGHT",
    Dark: "DARK",
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
  },
}));

describe("native splash screen logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call SplashScreen.hide when not on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await hideNativeSplash();

    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it("calls SplashScreen.hide with default 350ms fadeOutDuration when on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await hideNativeSplash();

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 350 });
  });

  it("calls SplashScreen.hide with custom fadeOutDuration when provided", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await hideNativeSplash({ fadeOutDuration: 500 });

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 500 });
  });

  it("initNativeApp respects deferSplashHide option", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await initNativeApp({ deferSplashHide: true });

    expect(StatusBar.setStyle).toHaveBeenCalled();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it("initNativeApp hides splash screen by default if not deferred", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await initNativeApp();

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 350 });
  });
});

describe("native status bar chrome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setThemePreference("system");
    vi.unstubAllGlobals();
  });

  it("does nothing on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await syncNativeChrome();

    expect(StatusBar.setStyle).not.toHaveBeenCalled();
    expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
  });

  it("uses light bar content with no fill on dark theme (iOS)", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    setThemePreference("dark");

    await syncNativeChrome();

    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(StatusBar.setBackgroundColor).not.toHaveBeenCalled();
  });

  it("uses dark bar content with parchment fill on light theme (android)", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    setThemePreference("light");

    await syncNativeChrome();

    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: "DARK" });
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: "#eef1f6" });
  });

  it("follows the OS scheme when the preference is system", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    setThemePreference("system");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });

    await syncNativeChrome();

    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: "#000000" });
  });
});

describe("native haptics logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers light impact by default on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await triggerHaptic();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
  });

  it("triggers selectionChanged for selection style on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await triggerHaptic("selection");

    expect(Haptics.selectionChanged).toHaveBeenCalled();
  });

  it("triggerHapticSelection invokes selection haptics", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await triggerHapticSelection();

    expect(Haptics.selectionChanged).toHaveBeenCalled();
  });

  it("triggers notification for success, warning, error on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await triggerHaptic("success");
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });

    await triggerHaptic("warning");
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });

    await triggerHaptic("error");
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
  });

  it("falls back to navigator.vibrate when on web platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });

    await triggerHaptic("light");
    expect(vibrateSpy).toHaveBeenCalledWith(10);

    await triggerHapticSelection();
    expect(vibrateSpy).toHaveBeenCalledWith(10);

    vi.unstubAllGlobals();
  });
});
