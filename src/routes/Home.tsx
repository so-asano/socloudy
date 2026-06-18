import { homeTopAtom } from "@/atoms/feed";
import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { useTimeline, useTimelineLatest } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function HomePage() {
  const { t } = useTranslation();
  const query = useTimeline();
  const setHomeTop = useSetAtom(homeTopAtom);
  const { data: latestTop } = useTimelineLatest();
  const qc = useQueryClient();

  const currentTop = query.data?.pages[0]?.feed[0]?.post.uri;
  const hasNew = !!latestTop && !!currentTop && latestTop !== currentTop;

  // Remember the top post currently shown, so we can tell when newer posts exist.
  useEffect(() => {
    if (currentTop) setHomeTop(currentTop);
  }, [currentTop, setHomeTop]);

  // Tapping the pill pulls in new posts and returns to the top; the dot then clears
  // once the refreshed timeline's top post matches the latest.
  const loadNew = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    qc.invalidateQueries({ queryKey: ["timeline"] });
  };

  return (
    <>
      <PageHeader title={t("timeline.title")} dot={hasNew} onTitleClick={loadNew} />
      <Feed query={query} emptyText={t("timeline.empty")} />
    </>
  );
}
