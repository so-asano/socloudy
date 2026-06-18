import { sessionAtom } from "@/atoms/auth";
import { Avatar } from "@/components/Avatar";
import { CloudClip } from "@/components/CloudClip";
import { CloudShape } from "@/components/CloudShape";
import { Feed } from "@/components/Feed";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { useAuthorFeed, useProfile, useToggleFollow } from "@/lib/queries";
import { cloudSeed } from "@/lib/util";
import type { AppBskyActorDefs } from "@atproto/api";
import { useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export function ProfilePage() {
  const { t } = useTranslation();
  const { actor = "" } = useParams();
  const navigate = useNavigate();
  const me = useAtomValue(sessionAtom);
  const { data: profile, isLoading } = useProfile(actor);
  const feed = useAuthorFeed(actor);
  const isMe = !!profile && (profile.did === me?.did || profile.handle === me?.handle);

  return (
    <>
      <PageHeader title={profile?.displayName ?? profile?.handle ?? t("nav.profile")}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="back"
          className="grid size-8 place-items-center rounded-full transition hover:bg-white/25"
        >
          <ArrowLeft className="size-5" />
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : profile ? (
        <div className="p-4 pt-8 sm:px-6">
          <article className="cloud-card relative">
            <CloudShape seed={cloudSeed(profile.did)} />
            <div className="relative z-10 flex flex-col items-center text-center">
              <Avatar src={profile.avatar} alt={profile.handle} size={88} />
              {profile.banner ? (
                <CloudClip
                  src={profile.banner}
                  seed={cloudSeed(`${profile.did}-banner`)}
                  className="mt-3 h-28 w-full object-cover"
                />
              ) : null}
              <h2 className="mt-3 font-bold text-xl">{profile.displayName ?? profile.handle}</h2>
              <p className="flex items-center gap-2 text-zinc-500">
                @{profile.handle}
                {profile.viewer?.followedBy ? (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                    {t("profile.followsYou")}
                  </span>
                ) : null}
              </p>
              {profile.description ? (
                <p className="mt-2 whitespace-pre-wrap text-[15px]">{profile.description}</p>
              ) : null}
              <div className="mt-3 flex gap-4 text-sm">
                <Stat n={profile.postsCount} label={t("profile.posts")} />
                <Stat n={profile.followersCount} label={t("profile.followers")} />
                <Stat n={profile.followsCount} label={t("profile.following")} />
              </div>
              {!isMe ? (
                <div className="mt-3">
                  <FollowButton profile={profile} />
                </div>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      <Feed query={feed} emptyText={t("profile.empty")} />
    </>
  );
}

function FollowButton({ profile }: { profile: AppBskyActorDefs.ProfileViewDetailed }) {
  const { t } = useTranslation();
  const toggle = useToggleFollow(profile.handle);
  const following = !!profile.viewer?.following;
  return (
    <button
      type="button"
      onClick={() => toggle.mutate(profile)}
      className={`rounded-full px-4 py-1.5 font-semibold text-sm transition ${
        following
          ? "border border-white hover:border-red-300 hover:text-red-500 dark:border-white"
          : "bg-sky text-white hover:bg-sky-dark"
      }`}
    >
      {following ? t("profile.unfollow") : t("profile.follow")}
    </button>
  );
}

function Stat({ n, label }: { n?: number; label: string }) {
  return (
    <span>
      <span className="font-bold">{n ?? 0}</span> <span className="text-zinc-500">{label}</span>
    </span>
  );
}
