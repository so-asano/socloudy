import { composerAtom } from "@/atoms/composer";
import { Avatar } from "@/components/Avatar";
import { CloudShape } from "@/components/CloudShape";
import { PostEmbed } from "@/components/PostEmbed";
import { RichText } from "@/components/RichText";
import { useCloudMotion } from "@/lib/cloudMotion";
import { useToggleLike, useToggleRepost } from "@/lib/queries";
import { cloudSeed, threadPath, timeAgo } from "@/lib/util";
import type { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { useSetAtom } from "jotai";
import { Heart, type LucideIcon, MessageCircle, Repeat2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type PostView = AppBskyFeedDefs.PostView;

export function PostCard({
  post,
  reason,
  replyTo,
  focused = false,
}: {
  post: PostView;
  reason?: AppBskyFeedDefs.FeedViewPost["reason"];
  replyTo?: string;
  focused?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const setComposer = useSetAtom(composerAtom);
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();

  const record = post.record as AppBskyFeedPost.Record;
  const author = post.author;
  const seed = cloudSeed(post.cid);

  // Scroll-linked coverflow motion; `focused` only drives emphasis styling below.
  const ref = useCloudMotion<HTMLElement>(seed);
  // Scale the font to the post length: short posts get big, airy text; long posts
  // shrink so the cloud stays a reasonable size.
  const len = record.text.length;
  const textSize =
    len <= 30
      ? "text-2xl"
      : len <= 80
        ? "text-xl"
        : len <= 160
          ? "text-[17px]"
          : len <= 280
            ? "text-[15px]"
            : len <= 450
              ? "text-sm"
              : "text-[13px]";
  const liked = !!post.viewer?.like;
  const reposted = !!post.viewer?.repost;
  const [popping, setPopping] = useState(false);

  const onLike = () => {
    if (!liked) setPopping(true); // puff the cloud when liking (not when un-liking)
    toggleLike.mutate(post);
  };

  const onRepost = () => {
    if (!reposted) setPopping(true);
    toggleRepost.mutate(post);
  };
  const repostedBy =
    reason && "by" in reason ? (reason.by as { displayName?: string; handle: string }) : null;

  const openReply = () => {
    const ref = { uri: post.uri, cid: post.cid };
    const root = record.reply?.root ?? ref;
    setComposer({
      open: true,
      reply: { parent: ref, root },
      replyToHandle: author.handle,
    });
  };

  // "Stretched link" pattern: a full-card overlay <Link> handles navigation to the
  // thread, while interactive children are raised above it (relative z-10) so their
  // own clicks win. This keeps the card keyboard-accessible with no onClick on <article>.
  return (
    <article ref={ref} className={`cloud-card relative ${focused ? "cloud-card--focused" : ""}`}>
      <CloudShape
        seed={seed}
        className={popping ? "is-popping" : ""}
        onAnimationEnd={() => setPopping(false)}
      />
      {/* content layer sits above the z-0 cloud; pops together with the cloud on like/repost */}
      <div className={`relative z-10 ${popping ? "is-popping" : ""}`}>
        <Link
          to={threadPath(post.uri)}
          className="absolute inset-0 z-0"
          aria-label={`${author.displayName ?? author.handle}: ${record.text}`}
          tabIndex={-1}
        />
        {repostedBy ? (
          <p className="mb-1 flex items-center gap-1 pl-12 text-xs text-zinc-500">
            <Repeat2 className="size-3.5" /> {repostedBy.displayName ?? repostedBy.handle}
          </p>
        ) : null}
        {replyTo ? (
          <p className="mb-1 flex items-center gap-1 pl-12 text-xs text-zinc-500">
            <MessageCircle className="size-3.5" /> {t("post.replyingTo", { handle: `@${replyTo}` })}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Link to={`/profile/${author.handle}`} className="relative z-10">
            <Avatar src={author.avatar} alt={author.handle} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1 text-sm">
              <Link
                to={`/profile/${author.handle}`}
                className="relative z-10 truncate font-semibold hover:underline"
              >
                {author.displayName ?? author.handle}
              </Link>
              <span className="truncate text-zinc-500">@{author.handle}</span>
              <span className="text-zinc-400">·</span>
              <span className="shrink-0 text-zinc-500">
                {timeAgo(record.createdAt, i18n.resolvedLanguage ?? "en")}
              </span>
            </div>

            <div className={`mt-0.5 ${textSize}`}>
              <RichText text={record.text} facets={record.facets} />
            </div>

            {post.embed ? (
              <div className="relative z-10 mt-2">
                <PostEmbed embed={post.embed} />
              </div>
            ) : null}

            <div className="relative z-10 mt-2 flex items-center justify-center gap-10 text-zinc-500 text-sm sm:gap-14">
              <Action
                icon={MessageCircle}
                label={t("post.reply")}
                onClick={openReply}
                count={post.replyCount}
              />
              <Action
                icon={Repeat2}
                label={t("post.repost")}
                active={reposted}
                activeClass="text-green-600"
                count={post.repostCount}
                onClick={onRepost}
              />
              <Action
                icon={Heart}
                label={t("post.like")}
                active={liked}
                fill={liked}
                activeClass="text-pink-600"
                count={post.likeCount}
                onClick={onLike}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Action({
  icon: Icon,
  label,
  count,
  active,
  fill,
  activeClass = "",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  active?: boolean;
  fill?: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition hover:bg-zinc-200/60 dark:hover:bg-zinc-800 ${
        active ? activeClass : ""
      }`}
    >
      <Icon className="size-[18px]" fill={fill ? "currentColor" : "none"} />
      {count ? <span className="text-xs tabular-nums">{count}</span> : null}
    </button>
  );
}
