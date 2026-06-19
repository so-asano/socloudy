import { Capacitor } from "@capacitor/core";

/** Native-only setup (no-op on web): tint the status bar to match the sky theme. */
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
}
