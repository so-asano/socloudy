import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { useFeedPosts, useSavedFeeds } from "@/lib/queries";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export function FeedViewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { feed = "" } = useParams();
  const uri = decodeURIComponent(feed);
  const query = useFeedPosts(uri);
  const { data: feeds } = useSavedFeeds();
  const name = feeds?.find((f) => f.uri === uri)?.name ?? "Feed";

  return (
    <>
      <PageHeader title={name}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="back"
          className="grid size-8 place-items-center rounded-full transition hover:bg-white/25"
        >
          <ArrowLeft className="size-5" />
        </button>
      </PageHeader>
      <Feed query={query} emptyText={t("timeline.empty")} />
    </>
  );
}
