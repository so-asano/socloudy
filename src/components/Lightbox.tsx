import { lightboxAtom } from "@/atoms/lightbox";
import { useAtom } from "jotai";
import { X } from "lucide-react";
import { useEffect } from "react";

/** Fullscreen image viewer. Click anywhere or press Escape to close. */
export function Lightbox() {
  const [src, setSrc] = useAtom(lightboxAtom);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, setSrc]);

  if (!src) return null;

  return (
    <button
      type="button"
      aria-label="close"
      onClick={() => setSrc(null)}
      className="fixed inset-0 z-[200] grid cursor-zoom-out place-items-center bg-black/85 p-6 backdrop-blur-sm"
    >
      <img src={src} alt="" className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain" />
      <span className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white">
        <X className="size-6" />
      </span>
    </button>
  );
}
