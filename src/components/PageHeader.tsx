import type { ReactNode } from "react";

/**
 * Floating pill header: a rounded, shadowed chip that hovers over the scrolling feed
 * (sticky, with a margin and backdrop blur) rather than a full-width bar.
 */
export function PageHeader({
  title,
  children,
  dot,
  onTitleClick,
}: {
  title: string;
  children?: ReactNode;
  /** show a small dot after the title (e.g. new posts available) */
  dot?: boolean;
  /** overrides the default scroll-to-top behaviour when tapping the title */
  onTitleClick?: () => void;
}) {
  const handleClick = onTitleClick ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }));
  return (
    <div className="pointer-events-none sticky top-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white bg-sky/85 py-2 pr-5 pl-4 font-bold text-base text-white shadow-lg shadow-sky/20 backdrop-blur-xl">
        {children}
        {/* tapping the title scrolls back to the top (or loads new posts) */}
        <button type="button" onClick={handleClick} className="flex items-center gap-1.5">
          <h1>{title}</h1>
          {dot ? <span className="size-2 rounded-full bg-white" /> : null}
        </button>
      </div>
    </div>
  );
}
