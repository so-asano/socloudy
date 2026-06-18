import { agent } from "@/lib/agent";
import type { AppBskyActorDefs, AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type FeedViewPost = AppBskyFeedDefs.FeedViewPost;
type PostView = AppBskyFeedDefs.PostView;
type FeedPage = { feed: FeedViewPost[]; cursor?: string };

/** Home timeline as an infinite query. */
export function useTimeline() {
  return useInfiniteQuery({
    queryKey: ["timeline"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.getTimeline({ limit: 30, cursor: pageParam });
      return res.data as FeedPage;
    },
    getNextPageParam: (last) => last.cursor,
  });
}

/** A user's authored posts (their profile feed). */
export function useAuthorFeed(actor: string) {
  return useInfiniteQuery({
    queryKey: ["authorFeed", actor],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.getAuthorFeed({ actor, limit: 30, cursor: pageParam });
      return res.data as FeedPage;
    },
    getNextPageParam: (last) => last.cursor,
    enabled: !!actor,
  });
}

export function useProfile(actor: string) {
  return useQuery({
    queryKey: ["profile", actor],
    queryFn: async () => (await agent.getProfile({ actor })).data,
    enabled: !!actor,
  });
}

export function usePostThread(uri: string) {
  return useQuery({
    queryKey: ["thread", uri],
    queryFn: async () => (await agent.getPostThread({ uri })).data.thread,
    enabled: !!uri,
  });
}

/**
 * Resolve notification subject URIs to posts, returned as a (subjectUri → PostView) map.
 * Some subjects are post URIs (like/repost/quote), others are REPOST URIs (like-via-repost,
 * repost-via-repost) — those are resolved to the original post they point at first.
 */
export function useSubjectPosts(uris: string[]) {
  const sorted = [...new Set(uris)].sort();
  return useQuery({
    queryKey: ["subjectPosts", sorted],
    enabled: sorted.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // subjectUri (as given on the notification) → the post URI to actually fetch
      const postFor: Record<string, string> = {};
      const reposts: string[] = [];
      for (const u of sorted) {
        if (u.includes("/app.bsky.feed.post/")) postFor[u] = u;
        else if (u.includes("/app.bsky.feed.repost/")) reposts.push(u);
      }
      await Promise.all(
        reposts.map(async (u) => {
          const m = u.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.repost\/(.+)$/);
          if (!m) return;
          try {
            const rec = await agent.com.atproto.repo.getRecord({
              repo: m[1],
              collection: "app.bsky.feed.repost",
              rkey: m[2],
            });
            const postUri = (rec.data.value as { subject?: { uri?: string } }).subject?.uri;
            if (postUri) postFor[u] = postUri;
          } catch {
            // repost may be deleted — skip
          }
        }),
      );

      const toFetch = [...new Set(Object.values(postFor))];
      const byUri: Record<string, PostView> = {};
      for (let i = 0; i < toFetch.length; i += 25) {
        const res = await agent.getPosts({ uris: toFetch.slice(i, i + 25) });
        for (const p of res.data.posts) byUri[p.uri] = p;
      }

      const map: Record<string, PostView> = {};
      for (const [subjectUri, postUri] of Object.entries(postFor)) {
        if (byUri[postUri]) map[subjectUri] = byUri[postUri];
      }
      return map;
    },
  });
}

/**
 * Patch every cached copy of a post (across timeline + author feeds) in place.
 * Lets like/repost feel instant without refetching whole pages.
 */
function patchCachedPost(
  qc: ReturnType<typeof useQueryClient>,
  uri: string,
  patch: (p: PostView) => void,
) {
  qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ["timeline"] }, (data) =>
    patchInfinite(data, uri, patch),
  );
  qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ["authorFeed"] }, (data) =>
    patchInfinite(data, uri, patch),
  );
}

function patchInfinite(
  data: InfiniteData<FeedPage> | undefined,
  uri: string,
  patch: (p: PostView) => void,
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      feed: page.feed.map((item) => {
        if (item.post.uri !== uri) return item;
        const post = structuredClone(item.post);
        patch(post);
        return { ...item, post };
      }),
    })),
  };
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: PostView) => {
      const likeUri = post.viewer?.like;
      if (likeUri) {
        await agent.deleteLike(likeUri);
        return { uri: post.uri, like: undefined };
      }
      const res = await agent.like(post.uri, post.cid);
      return { uri: post.uri, like: res.uri };
    },
    onMutate: async (post) => {
      const liked = !!post.viewer?.like;
      patchCachedPost(qc, post.uri, (p) => {
        p.likeCount = (p.likeCount ?? 0) + (liked ? -1 : 1);
        p.viewer = { ...p.viewer, like: liked ? undefined : "optimistic" };
      });
    },
    onSuccess: ({ uri, like }) => {
      patchCachedPost(qc, uri, (p) => {
        p.viewer = { ...p.viewer, like };
      });
    },
    onError: (_e, post) => {
      const liked = !!post.viewer?.like;
      patchCachedPost(qc, post.uri, (p) => {
        p.likeCount = (p.likeCount ?? 0) + (liked ? 1 : -1);
        p.viewer = { ...p.viewer, like: post.viewer?.like };
      });
    },
  });
}

export function useToggleRepost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: PostView) => {
      const repostUri = post.viewer?.repost;
      if (repostUri) {
        await agent.deleteRepost(repostUri);
        return { uri: post.uri, repost: undefined };
      }
      const res = await agent.repost(post.uri, post.cid);
      return { uri: post.uri, repost: res.uri };
    },
    onMutate: async (post) => {
      const reposted = !!post.viewer?.repost;
      patchCachedPost(qc, post.uri, (p) => {
        p.repostCount = (p.repostCount ?? 0) + (reposted ? -1 : 1);
        p.viewer = { ...p.viewer, repost: reposted ? undefined : "optimistic" };
      });
    },
    onSuccess: ({ uri, repost }) => {
      patchCachedPost(qc, uri, (p) => {
        p.viewer = { ...p.viewer, repost };
      });
    },
    onError: (_e, post) => {
      const reposted = !!post.viewer?.repost;
      patchCachedPost(qc, post.uri, (p) => {
        p.repostCount = (p.repostCount ?? 0) + (reposted ? 1 : -1);
        p.viewer = { ...p.viewer, repost: post.viewer?.repost };
      });
    },
  });
}

export type ReplyTarget = {
  /** the post being replied to */
  parent: { uri: string; cid: string };
  /** the root of the thread (same as parent for top-level replies) */
  root: { uri: string; cid: string };
};

export type ImageDraft = { file: File; alt: string };

/** Upload draft images as blobs and assemble an app.bsky.embed.images record. */
async function buildImageEmbed(images: ImageDraft[]) {
  const uploaded = await Promise.all(
    images.map(async ({ file, alt }) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await agent.uploadBlob(bytes, { encoding: file.type });
      return { image: res.data.blob, alt };
    }),
  );
  return { $type: "app.bsky.embed.images", images: uploaded } as const;
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      text,
      reply,
      images,
    }: {
      text: string;
      reply?: ReplyTarget;
      images?: ImageDraft[];
    }) => {
      const record: Partial<AppBskyFeedPost.Record> & { text: string } = { text };
      if (reply) record.reply = reply;
      if (images && images.length > 0) {
        record.embed = await buildImageEmbed(images);
      }
      return agent.post(record);
    },
    onSuccess: (_data, vars) => {
      if (vars.reply) {
        qc.invalidateQueries({ queryKey: ["thread", vars.reply.parent.uri] });
      } else {
        qc.invalidateQueries({ queryKey: ["timeline"] });
      }
    },
  });
}

/** Follow / unfollow an actor, optimistically patching the cached profile. */
export function useToggleFollow(actor: string) {
  const qc = useQueryClient();
  type Profile = AppBskyActorDefs.ProfileViewDetailed;
  const patch = (mut: (p: Profile) => void) =>
    qc.setQueryData<Profile>(["profile", actor], (p) => {
      if (!p) return p;
      const next = structuredClone(p);
      mut(next);
      return next;
    });

  return useMutation({
    mutationFn: async (profile: Profile) => {
      const following = profile.viewer?.following;
      if (following) {
        await agent.deleteFollow(following);
        return { following: undefined };
      }
      const res = await agent.follow(profile.did);
      return { following: res.uri };
    },
    onMutate: (profile) => {
      const following = !!profile.viewer?.following;
      patch((p) => {
        p.followersCount = (p.followersCount ?? 0) + (following ? -1 : 1);
        p.viewer = { ...p.viewer, following: following ? undefined : "optimistic" };
      });
    },
    onSuccess: ({ following }) => {
      patch((p) => {
        p.viewer = { ...p.viewer, following };
      });
    },
    onError: (_e, profile) => {
      const following = !!profile.viewer?.following;
      patch((p) => {
        p.followersCount = (p.followersCount ?? 0) + (following ? 1 : -1);
        p.viewer = { ...p.viewer, following: profile.viewer?.following };
      });
    },
  });
}

/** Search for actors (people) by query string. */
export function useSearchActors(q: string) {
  return useInfiniteQuery({
    queryKey: ["searchActors", q],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.searchActors({ q, limit: 25, cursor: pageParam });
      return res.data;
    },
    getNextPageParam: (last) => last.cursor,
    enabled: q.trim().length > 0,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.listNotifications({ limit: 30, cursor: pageParam });
      return res.data;
    },
    getNextPageParam: (last) => last.cursor,
  });
}

/** Unread notification count, polled periodically for the nav badge. */
export function useUnreadCount() {
  return useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => (await agent.countUnreadNotifications()).data.count,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seenAt: string) => {
      await agent.updateSeenNotifications(seenAt);
    },
    onSuccess: () => {
      qc.setQueryData(["unreadCount"], 0);
    },
  });
}
