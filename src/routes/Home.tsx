import { homeTopAtom } from "@/atoms/feed";
import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { useTimeline } from "@/lib/queries";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function HomePage() {
  const { t } = useTranslation();
  const query = useTimeline();
  const setHomeTop = useSetAtom(homeTopAtom);

  // Remember the top post currently shown, so the nav can tell when newer posts exist.
  useEffect(() => {
    const top = query.data?.pages[0]?.feed[0]?.post.uri;
    if (top) setHomeTop(top);
  }, [query.data, setHomeTop]);

  return (
    <>
      <PageHeader title={t("timeline.title")} />
      <Feed query={query} emptyText={t("timeline.empty")} />
    </>
  );
}
