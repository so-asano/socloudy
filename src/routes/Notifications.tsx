import { Avatar } from "@/components/Avatar";
import { CloudShape } from "@/components/CloudShape";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { useCloudMotion } from "@/lib/cloudMotion";
import {
  type Subject,
  useMarkNotificationsRead,
  useNotifications,
  useSubjectPosts,
} from "@/lib/queries";
import { cloudSeed, threadPath, timeAgo } from "@/lib/util";
import {
  AppBskyEmbedImages,
  type AppBskyFeedPost,
  type AppBskyNotificationListNotifications,
} from "@atproto/api";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type Notification = AppBskyNotificationListNotifications.Notification;

const REASON_KEY: Record<string, string> = {
  like: "notifications.liked",
  repost: "notifications.reposted",
  follow: "notifications.followed",
  reply: "notifications.replied",
  mention: "notifications.mentioned",
  quote: "notifications.quoted",
  "like-via-repost": "notifications.likedViaRepost",
  "repost-via-repost": "notifications.repostedViaRepost",
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const query = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const sentinel = useRef<HTMLDivElement>(null);
  const marked = useRef(false);

  // Mark everything seen once the list first loads.
  useEffect(() => {
    if (!marked.current && data) {
      marked.current = true;
      markRead.mutate(new Date().toISOString());
    }
  }, [data, markRead]);

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

  const items = data?.pages.flatMap((p) => p.notifications) ?? [];
  const subjectUris = items.map((n) => n.reasonSubject).filter((u): u is string => !!u);
  const { data: subjects } = useSubjectPosts(subjectUris);

  return (
    <>
      <PageHeader title={t("notifications.title")} />
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">{t("notifications.empty")}</p>
      ) : (
        <div className="cloud-stack px-4 pt-[36vh] pb-[40vh] sm:px-6">
          {items.map((n) => (
            <NotificationRow
              key={`${n.uri}:${n.reason}`}
              n={n}
              subject={n.reasonSubject ? subjects?.[n.reasonSubject] : undefined}
            />
          ))}
          <div ref={sentinel} className="grid place-items-center py-8">
            {isFetchingNextPage ? <Spinner /> : null}
          </div>
        </div>
      )}
    </>
  );
}

function NotificationRow({ n, subject }: { n: Notification; subject?: Subject }) {
  const { t, i18n } = useTranslation();
  const record = n.record as { text?: string } | undefined;
  const isFeedSubject = !!subject?.feed;
  // like/repost point at the liked post (or feed); reply/mention/quote at the new post.
  const target = n.reason === "like" || n.reason === "repost" ? n.reasonSubject : n.uri;
  const to =
    n.reason === "follow"
      ? `/profile/${n.author.handle}`
      : isFeedSubject && target
        ? `/feed/${encodeURIComponent(target)}`
        : target
          ? threadPath(target)
          : null;

  // "liked your feed" / "reposted your feed" when the subject is a feed generator.
  const reasonKey = isFeedSubject
    ? n.reason === "repost"
      ? "notifications.repostedFeed"
      : "notifications.likedFeed"
    : REASON_KEY[n.reason];
  const action = reasonKey ? t(reasonKey) : n.reason;

  const post = subject?.post;
  const subjectText = post ? (post.record as AppBskyFeedPost.Record).text : undefined;
  const subjectImg =
    post && AppBskyEmbedImages.isView(post.embed) ? post.embed.images[0]?.thumb : undefined;

  const ref = useCloudMotion<HTMLDivElement>(cloudSeed(n.uri));

  const inner = (
    <>
      <div className="relative z-10">
        <div className="flex gap-3">
          <Avatar src={n.author.avatar} alt={n.author.handle} size={40} />
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{n.author.displayName || n.author.handle}</span>{" "}
              <span className="text-zinc-500">{action}</span>{" "}
              <span className="text-zinc-400">
                · {timeAgo(n.indexedAt, i18n.resolvedLanguage ?? "en")}
              </span>
            </p>
            {record?.text ? (
              <p className="mt-1 whitespace-pre-wrap text-[15px]">{record.text}</p>
            ) : null}
          </div>
        </div>
        {/* the post or feed this notification is about */}
        {subjectText || subjectImg ? (
          <div className="mt-2 space-y-2 rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/10">
            {subjectText ? (
              <p className="line-clamp-4 whitespace-pre-wrap text-[15px]">{subjectText}</p>
            ) : null}
            {subjectImg ? (
              <img src={subjectImg} alt="" className="max-h-40 w-full rounded-xl object-cover" />
            ) : null}
          </div>
        ) : subject?.feed ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/10">
            {subject.feed.avatar ? (
              <img src={subject.feed.avatar} alt="" className="size-8 rounded-lg" />
            ) : null}
            <span className="font-semibold text-[15px]">{subject.feed.name}</span>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div ref={ref} className="cloud-card is-compact relative">
      <CloudShape seed={cloudSeed(n.uri)} />
      {to ? (
        <Link to={to} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
