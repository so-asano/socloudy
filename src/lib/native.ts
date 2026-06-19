import { Capacitor } from "@capacitor/core";

/** Native-only setup (no-op on web): status bar tint, top inset flag, tap haptics. */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  // marks the app as running in a native shell so CSS can add a top inset
  document.documentElement.classList.add("cap-native");

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light }); // white content over the blue bar
    await StatusBar.setBackgroundColor({ color: "#3f8bea" }); // Android only; ignored on iOS
  } catch {
    // status bar plugin unavailable — ignore
  }

  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    // a light tap on any interactive control
    document.addEventListener(
      "pointerdown",
      (e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a[href], [role="button"], input[type="checkbox"]')) {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
      },
      { capture: true, passive: true },
    );
  } catch {
    // haptics plugin unavailable — ignore
  }
}
