import type { ReactNode } from "react";

/**
 * Floating pill header: a rounded, shadowed chip that hovers over the scrolling feed
 * (sticky, with a margin and backdrop blur) rather than a full-width bar.
 */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pointer-events-none sticky top-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white bg-white/15 py-2 pr-5 pl-4 font-bold text-base text-white shadow-lg shadow-sky/20 backdrop-blur-xl">
        {children}
        {/* tapping the title scrolls back to the top */}
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <h1>{title}</h1>
        </button>
      </div>
    </div>
  );
}
