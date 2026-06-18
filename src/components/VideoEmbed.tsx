import type { AppBskyEmbedVideo } from "@atproto/api";
import { useEffect, useRef } from "react";

/**
 * Plays a Bluesky video embed (HLS playlist). Safari plays HLS natively; other browsers
 * load hls.js on demand (dynamic import keeps it out of the main bundle).
 */
export function VideoEmbed({ video }: { video: AppBskyEmbedVideo.View }) {
  const ref = useRef<HTMLVideoElement>(null);
  const aspect = video.aspectRatio
    ? `${video.aspectRatio.width} / ${video.aspectRatio.height}`
    : "16 / 9";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = video.playlist; // native HLS (Safari/iOS)
      return;
    }
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !ref.current || !Hls.isSupported()) return;
      const hls = new Hls();
      hls.loadSource(video.playlist);
      hls.attachMedia(ref.current);
      cleanup = () => hls.destroy();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [video.playlist]);

  return (
    // biome-ignore lint/a11y/useMediaCaption: user-generated video has no caption track
    <video
      ref={ref}
      controls
      playsInline
      poster={video.thumbnail}
      aria-label={video.alt}
      className="w-full rounded-xl bg-black"
      style={{ aspectRatio: aspect }}
    />
  );
}
