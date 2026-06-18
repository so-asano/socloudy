import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { useTimeline } from "@/lib/queries";
import { useTranslation } from "react-i18next";

export function HomePage() {
  const { t } = useTranslation();
  const query = useTimeline();
  return (
    <>
      <PageHeader title={t("timeline.title")} />
      <Feed query={query} emptyText={t("timeline.empty")} />
    </>
  );
}
