import { lightboxAtom } from "@/atoms/lightbox";
import { useAtom } from "jotai";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Fullscreen image viewer. Multiple images live in a horizontal scroll-snap
 * pager (native swipe). Click outside the image / Escape to close; arrows or the
 * side buttons page through.
 */
export function Lightbox() {
  const [state, setState] = useAtom(lightboxAtom);
  const scroller = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // lock background scroll + keyboard controls while open
  useEffect(() => {
    if (!state) {
      didInit.current = false;
      return;
    }
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const page = (delta: number) => {
      const el = scroller.current;
      if (el) el.scrollBy({ left: delta * el.clientWidth, behavior: "smooth" });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
      else if (e.key === "ArrowRight") page(1);
      else if (e.key === "ArrowLeft") page(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [state, setState]);

  // jump to the requested image when the lightbox opens
  useEffect(() => {
    if (!state || didInit.current) return;
    const el = scroller.current;
    if (el) {
      el.scrollLeft = state.index * el.clientWidth;
      didInit.current = true;
    }
  }, [state]);

  if (!state) return null;
  const { images, index } = state;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setState((s) => (s ? { ...s, index: i } : s));
  };
  const page = (delta: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: delta * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="fixed top-0 left-0 z-[200] h-dvh w-screen bg-black/85 backdrop-blur-sm">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: positional slides
            key={i}
            type="button"
            aria-label="close"
            onClick={() => setState(null)}
            className="flex w-full shrink-0 cursor-zoom-out snap-center items-center justify-center p-6"
          >
            <img
              src={img}
              alt=""
              className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain"
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="close"
        onClick={() => setState(null)}
        className="absolute top-[calc(1rem_+_var(--top-inset))] right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="size-6" />
      </button>

      {index > 0 ? (
        <button
          type="button"
          aria-label="previous"
          onClick={() => page(-1)}
          className="-translate-y-1/2 absolute top-1/2 left-4 grid size-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}
      {index < images.length - 1 ? (
        <button
          type="button"
          aria-label="next"
          onClick={() => page(1)}
          className="-translate-y-1/2 absolute top-1/2 right-4 grid size-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}

      {images.length > 1 ? (
        <span className="-translate-x-1/2 absolute bottom-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))] left-1/2 rounded-full bg-white/15 px-3 py-1 font-medium text-sm text-white">
          {index + 1} / {images.length}
        </span>
      ) : null}
    </div>
  );
}
