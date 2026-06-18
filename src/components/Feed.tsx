import { PostCard } from "@/components/PostCard";
import { Spinner } from "@/components/Spinner";
import { AppBskyFeedDefs } from "@atproto/api";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type FeedPage = { feed: AppBskyFeedDefs.FeedViewPost[]; cursor?: string };

/** Renders an infinite feed query with auto-load-on-scroll and dedup. */
export function Feed({
  query,
  emptyText,
}: {
  query: UseInfiniteQueryResult<InfiniteData<FeedPage>>;
  emptyText: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    query;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid place-items-center gap-3 py-16 text-zinc-500">
        <p>{t("common.error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border border-white px-4 py-1.5 text-sm dark:border-white"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const items = dedupe(data?.pages.flatMap((p) => p.feed) ?? []);
  if (items.length === 0) {
    return <p className="py-16 text-center text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="cloud-stack px-4 pt-[36vh] pb-[40vh] sm:px-6">
      {items.map((item) => (
        <PostCard
          key={feedKey(item)}
          post={item.post}
          reason={item.reason}
          replyTo={replyToHandle(item)}
        />
      ))}
      <div ref={sentinel} className="grid place-items-center py-8">
        {isFetchingNextPage ? <Spinner /> : null}
      </div>
    </div>
  );
}

/** Handle of the post this item is replying to, if the parent is available in the feed. */
function replyToHandle(item: AppBskyFeedDefs.FeedViewPost): string | undefined {
  const parent = item.reply?.parent;
  return parent && AppBskyFeedDefs.isPostView(parent) ? parent.author.handle : undefined;
}

function feedKey(item: AppBskyFeedDefs.FeedViewPost): string {
  const reasonBy =
    item.reason && "by" in item.reason ? (item.reason.by as { did: string }).did : "";
  return `${item.post.uri}:${reasonBy}`;
}

/** Drop repeated posts that can appear across timeline pages. */
function dedupe(items: AppBskyFeedDefs.FeedViewPost[]): AppBskyFeedDefs.FeedViewPost[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = feedKey(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
