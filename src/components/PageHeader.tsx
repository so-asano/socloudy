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
    <div className="pointer-events-none fixed top-[calc(0.75rem_+_env(safe-area-inset-top,0px))] right-0 left-0 z-30 flex justify-center gap-2 px-4 sm:left-64">
      {/* leading controls (e.g. a back button) sit as their own pills beside the title */}
      {children}
      {/* the whole title pill is a button: tapping it scrolls to top (or loads new posts) */}
      <button
        type="button"
        onClick={handleClick}
        className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full border border-white bg-sky py-2 pr-5 pl-4 font-bold text-base text-white shadow-lg shadow-sky/20"
      >
        <h1 className="flex items-center gap-1.5">
          {title}
          {dot ? <span className="size-2 rounded-full bg-white" /> : null}
        </h1>
      </button>
    </div>
  );
}
