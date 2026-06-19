import { bookmarksAtom } from "@/atoms/bookmarks";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { Spinner } from "@/components/Spinner";
import { useBookmarkedPosts } from "@/lib/queries";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";

export function BookmarksPage() {
  const { t } = useTranslation();
  const uris = useAtomValue(bookmarksAtom);
  const { data: posts, isLoading } = useBookmarkedPosts(uris);

  return (
    <>
      <PageHeader title={t("nav.bookmarks")} />
      {uris.length === 0 ? (
        <p className="py-16 text-center text-white/80">{t("bookmarks.empty")}</p>
      ) : isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="cloud-stack px-4 pt-[36vh] pb-[40vh] sm:px-6">
          {posts?.map((p) => (
            <PostCard key={p.uri} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
