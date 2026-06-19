import { Avatar } from "@/components/Avatar";
import { CloudShape } from "@/components/CloudShape";
import { Spinner } from "@/components/Spinner";
import { useCloudMotion } from "@/lib/cloudMotion";
import { useSearchActors } from "@/lib/queries";
import { cloudSeed } from "@/lib/util";
import type { AppBskyActorDefs } from "@atproto/api";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function SearchPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const query = useSearchActors(q);

  // Debounce the typed query so we don't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const sentinel = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // dismiss the keyboard once the user scrolls into the results
  useEffect(() => {
    const onScroll = () => {
      if (document.activeElement === inputRef.current) inputRef.current?.blur();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const actors = data?.pages.flatMap((p) => p.actors) ?? [];

  return (
    <>
      {/* the search field is its own cloud, pinned to the top */}
      <div className="sticky top-4 z-30 px-4 pt-2 sm:px-6">
        <div className="cloud-card is-compact relative mx-auto">
          <CloudShape seed={777} />
          <div className="relative z-10">
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") inputRef.current?.blur();
              }}
              enterKeyHint="search"
              placeholder={t("search.placeholder")}
              className="w-full bg-transparent text-center text-[15px] outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>
      </div>

      {q.trim().length === 0 ? null : isLoading ? (
        <div className="grid place-items-center py-12">
          <Spinner />
        </div>
      ) : actors.length === 0 ? (
        <p className="py-12 text-center text-white/80">{t("search.empty")}</p>
      ) : (
        <div className="cloud-stack px-4 pt-[30vh] pb-[40vh] sm:px-6">
          {actors.map((actor) => (
            <ActorRow key={actor.did} actor={actor} />
          ))}
          <div ref={sentinel} className="grid place-items-center py-8">
            {isFetchingNextPage ? <Spinner /> : null}
          </div>
        </div>
      )}
    </>
  );
}

function ActorRow({ actor }: { actor: AppBskyActorDefs.ProfileView }) {
  const ref = useCloudMotion<HTMLDivElement>(cloudSeed(actor.did));
  return (
    <div ref={ref} className="cloud-card is-compact relative">
      <CloudShape seed={cloudSeed(actor.did)} />
      <Link to={`/profile/${actor.handle}`} className="relative z-10 flex gap-3">
        <Avatar src={actor.avatar} alt={actor.handle} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{actor.displayName || actor.handle}</p>
          <p className="truncate text-sm text-zinc-500">@{actor.handle}</p>
          {actor.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
              {actor.description}
            </p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
