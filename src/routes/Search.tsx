import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { useSearchActors } from "@/lib/queries";
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
      <PageHeader title={t("search.title")} />
      <div className="border-white border-b p-3 dark:border-white">
        <input
          type="search"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full rounded-full border border-white bg-transparent px-4 py-2 outline-none focus:border-sky dark:border-white"
        />
      </div>

      {q.trim().length === 0 ? (
        <p className="py-16 text-center text-zinc-500">{t("search.prompt")}</p>
      ) : isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : actors.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">{t("search.empty")}</p>
      ) : (
        <div>
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
  return (
    <Link
      to={`/profile/${actor.handle}`}
      className="flex gap-3 border-white border-b px-4 py-3 transition hover:bg-zinc-50 dark:border-white dark:hover:bg-zinc-900/50"
    >
      <Avatar src={actor.avatar} alt={actor.handle} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{actor.displayName ?? actor.handle}</p>
        <p className="truncate text-sm text-zinc-500">@{actor.handle}</p>
        {actor.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {actor.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
