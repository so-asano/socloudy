import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { Spinner } from "@/components/Spinner";
import { useBookmarks } from "@/lib/queries";
import { AppBskyFeedDefs } from "@atproto/api";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export function BookmarksPage() {
  const { t } = useTranslation();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useBookmarks();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = (data?.pages.flatMap((p) => p.bookmarks) ?? [])
    .map((b) => b.item)
    .filter(AppBskyFeedDefs.isPostView);

  return (
    <>
      <PageHeader title={t("nav.bookmarks")} />
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : posts.length === 0 ? (
        <p className="py-16 text-center text-white/80">{t("bookmarks.empty")}</p>
      ) : (
        <div className="cloud-stack px-4 pt-[36vh] pb-[40vh] sm:px-6">
          {posts.map((p) => (
            <PostCard key={p.uri} post={p} />
          ))}
          <div ref={sentinel} className="grid place-items-center py-8">
            {isFetchingNextPage ? <Spinner /> : null}
          </div>
        </div>
      )}
    </>
  );
}
