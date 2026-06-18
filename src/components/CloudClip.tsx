import { cloudPath } from "@/components/CloudShape";
import { useId, useLayoutEffect, useRef, useState } from "react";

/**
 * An <img> clipped to a cloud silhouette via an SVG clipPath. Measures the rendered image
 * and regenerates the clip path (userSpaceOnUse, in px) so the cloud bumps stay true at any
 * size — used for the profile header image inside the profile cloud.
 */
export function CloudClip({
  src,
  seed = 1,
  className = "",
}: {
  src: string;
  seed?: number;
  className?: string;
}) {
  const rawId = useId();
  const id = `cloudclip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = useRef<HTMLImageElement>(null);
  const [d, setD] = useState("");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) setD(cloudPath(w, h, seed));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [seed]);

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <title>clip</title>
        <clipPath id={id} clipPathUnits="userSpaceOnUse">
          <path d={d} />
        </clipPath>
      </svg>
      <img ref={ref} src={src} alt="" className={className} style={{ clipPath: `url(#${id})` }} />
    </>
  );
}
