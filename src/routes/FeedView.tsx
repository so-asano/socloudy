import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { useFeedPosts, useSavedFeeds } from "@/lib/queries";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export function FeedViewPage() {
  const { t } = useTranslation();
  const { feed = "" } = useParams();
  const uri = decodeURIComponent(feed);
  const query = useFeedPosts(uri);
  const { data: feeds } = useSavedFeeds();
  const name = feeds?.find((f) => f.uri === uri)?.name ?? "Feed";

  return (
    <>
      <PageHeader title={name} />
      <Feed query={query} emptyText={t("timeline.empty")} />
    </>
  );
}
