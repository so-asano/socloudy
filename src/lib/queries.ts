import { agent } from "@/lib/agent";
import type { AppBskyActorDefs, AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { RichText } from "@atproto/api";
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

/** Lightweight poll of the newest home post's URI, to detect new posts without inserting them. */
export function useTimelineLatest() {
  return useQuery({
    queryKey: ["timelineLatest"],
    queryFn: async () => {
      const res = await agent.getTimeline({ limit: 1 });
      return res.data.feed[0]?.post.uri ?? null;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Posts from a custom feed generator, or a user list when given a list URI. */
export function useFeedPosts(feed: string) {
  const isList = feed.includes("/app.bsky.graph.list/");
  return useInfiniteQuery({
    queryKey: ["feed", feed],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = isList
        ? await agent.app.bsky.feed.getListFeed({ list: feed, limit: 30, cursor: pageParam })
        : await agent.app.bsky.feed.getFeed({ feed, limit: 30, cursor: pageParam });
      return res.data as FeedPage;
    },
    getNextPageParam: (last) => last.cursor,
    enabled: !!feed,
  });
}

/** The user's bookmarks (app.bsky.bookmark.getBookmarks), newest first. */
export function useBookmarks() {
  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.app.bsky.bookmark.getBookmarks({ limit: 30, cursor: pageParam });
      return res.data;
    },
    getNextPageParam: (last) => last.cursor,
  });
}

export type SavedFeed = {
  /** stable key from the saved-feeds preference */
  key: string;
  type: "feed" | "list" | "timeline";
  /** feed/list AT-URI, or "following" for the home timeline */
  uri: string;
  /** display name; empty for the timeline (the UI localises it) */
  name: string;
  avatar?: string;
};

/**
 * The user's pinned feeds/lists/timeline from preferences (savedFeedsPrefV2),
 * kept in the saved order, resolved to name + avatar.
 */
export function useSavedFeeds() {
  return useQuery({
    queryKey: ["savedFeeds"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SavedFeed[]> => {
      const prefs = await agent.getPreferences();
      const pinned = prefs.savedFeeds.filter((f) => f.pinned);
      if (pinned.length === 0) return [];

      // resolve feed-generator names/avatars in one batch
      const feedUris = pinned.filter((f) => f.type === "feed").map((f) => f.value);
      const feedByUri: Record<string, AppBskyFeedDefs.GeneratorView> = {};
      if (feedUris.length > 0) {
        const gens = await agent.app.bsky.feed.getFeedGenerators({ feeds: feedUris });
        for (const g of gens.data.feeds) feedByUri[g.uri] = g;
      }

      // resolve list names/avatars (one call each — usually only a handful)
      const listByUri: Record<string, { name: string; avatar?: string }> = {};
      await Promise.all(
        pinned
          .filter((f) => f.type === "list")
          .map(async (f) => {
            try {
              const res = await agent.app.bsky.graph.getList({ list: f.value, limit: 1 });
              listByUri[f.value] = { name: res.data.list.name, avatar: res.data.list.avatar };
            } catch {
              // list may be deleted/unavailable — skip metadata
            }
          }),
      );

      return pinned.map((f): SavedFeed => {
        if (f.type === "timeline") {
          return { key: f.id, type: "timeline", uri: "following", name: "" };
        }
        if (f.type === "list") {
          return {
            key: f.id,
            type: "list",
            uri: f.value,
            name: listByUri[f.value]?.name ?? "List",
            avatar: listByUri[f.value]?.avatar,
          };
        }
        return {
          key: f.id,
          type: "feed",
          uri: f.value,
          name: feedByUri[f.value]?.displayName ?? "Feed",
          avatar: feedByUri[f.value]?.avatar,
        };
      });
    },
  });
}

/** A user's authored posts (their profile feed). */
export function useAuthorFeed(actor: string) {
  return useInfiniteQuery({
    queryKey: ["authorFeed", actor],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await agent.getAuthorFeed({
        actor,
        limit: 30,
        cursor: pageParam,
        includePins: true,
      });
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

/** What a notification's subject resolves to: a post, or a feed generator. */
export type Subject = { post?: PostView; feed?: { name: string; avatar?: string } };

/**
 * Resolve notification subject URIs (subjectUri → Subject). Subjects may be posts
 * (like/repost/quote), REPOST records (like-via-repost — resolved to the original post),
 * or FEED GENERATORS (someone liked/reposted your feed).
 */
export function useSubjectPosts(uris: string[]) {
  const sorted = [...new Set(uris)].sort();
  return useQuery({
    queryKey: ["subjectPosts", sorted],
    enabled: sorted.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const postFor: Record<string, string> = {}; // subjectUri → post URI to fetch
      const reposts: string[] = [];
      const generators: string[] = [];
      for (const u of sorted) {
        if (u.includes("/app.bsky.feed.post/")) postFor[u] = u;
        else if (u.includes("/app.bsky.feed.repost/")) reposts.push(u);
        else if (u.includes("/app.bsky.feed.generator/")) generators.push(u);
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

      const map: Record<string, Subject> = {};

      const toFetch = [...new Set(Object.values(postFor))];
      const byUri: Record<string, PostView> = {};
      for (let i = 0; i < toFetch.length; i += 25) {
        const res = await agent.getPosts({ uris: toFetch.slice(i, i + 25) });
        for (const p of res.data.posts) byUri[p.uri] = p;
      }
      for (const [subjectUri, postUri] of Object.entries(postFor)) {
        if (byUri[postUri]) map[subjectUri] = { post: byUri[postUri] };
      }

      if (generators.length > 0) {
        try {
          const gens = await agent.app.bsky.feed.getFeedGenerators({ feeds: generators });
          for (const g of gens.data.feeds) {
            map[g.uri] = { feed: { name: g.displayName, avatar: g.avatar } };
          }
        } catch {
          // ignore
        }
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
  for (const key of [["timeline"], ["authorFeed"], ["feed"]]) {
    qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: key }, (data) =>
      patchInfinite(data, uri, patch),
    );
  }
  // thread queries have a recursive ThreadViewPost shape, not a feed page
  qc.setQueriesData({ queryKey: ["thread"] }, (data) => patchThreadNode(data, uri, patch));
}

// biome-ignore lint/suspicious/noExplicitAny: ThreadViewPost is a recursive union; walk it loosely.
function patchThreadNode(node: any, uri: string, patch: (p: PostView) => void): any {
  if (!node || typeof node !== "object") return node;
  let changed = false;

  let post = node.post as PostView | undefined;
  if (post && post.uri === uri) {
    post = structuredClone(post);
    patch(post);
    changed = true;
  }

  let parent = node.parent;
  if (parent) {
    const next = patchThreadNode(parent, uri, patch);
    if (next !== parent) {
      parent = next;
      changed = true;
    }
  }

  let replies = node.replies;
  if (Array.isArray(replies)) {
    let repliesChanged = false;
    const next = replies.map((r: unknown) => {
      const x = patchThreadNode(r, uri, patch);
      if (x !== r) repliesChanged = true;
      return x;
    });
    if (repliesChanged) {
      replies = next;
      changed = true;
    }
  }

  return changed ? { ...node, post, parent, replies } : node;
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

/** Drop a post from every cached feed page (used after deleting it). */
function removeCachedPost(qc: ReturnType<typeof useQueryClient>, uri: string) {
  for (const key of [["timeline"], ["authorFeed"], ["feed"]]) {
    qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: key }, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          feed: page.feed.filter((item) => item.post.uri !== uri),
        })),
      };
    });
  }
}

/** Delete one of the user's own posts and remove it from the caches. */
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uri: string) => {
      await agent.deletePost(uri);
      return uri;
    },
    onSuccess: (uri) => {
      removeCachedPost(qc, uri);
      qc.invalidateQueries({ queryKey: ["thread"] });
    },
  });
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

/** Bookmark / un-bookmark a post via app.bsky.bookmark, patching cached copies. */
export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: PostView) => {
      if (post.viewer?.bookmarked) {
        await agent.app.bsky.bookmark.deleteBookmark({ uri: post.uri });
      } else {
        await agent.app.bsky.bookmark.createBookmark({ uri: post.uri, cid: post.cid });
      }
    },
    onMutate: async (post) => {
      const was = !!post.viewer?.bookmarked;
      patchCachedPost(qc, post.uri, (p) => {
        p.bookmarkCount = Math.max(0, (p.bookmarkCount ?? 0) + (was ? -1 : 1));
        p.viewer = { ...p.viewer, bookmarked: !was };
      });
    },
    onError: (_e, post) => {
      const was = !!post.viewer?.bookmarked;
      patchCachedPost(qc, post.uri, (p) => {
        p.bookmarkCount = Math.max(0, (p.bookmarkCount ?? 0) + (was ? 1 : -1));
        p.viewer = { ...p.viewer, bookmarked: was };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
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
      langs,
    }: {
      text: string;
      reply?: ReplyTarget;
      images?: ImageDraft[];
      langs?: string[];
    }) => {
      // detect mentions / links / hashtags and resolve handles to DIDs
      const rt = new RichText({ text });
      await rt.detectFacets(agent);
      const record: Partial<AppBskyFeedPost.Record> & { text: string } = { text: rt.text };
      if (rt.facets?.length) record.facets = rt.facets;
      if (langs && langs.length > 0) record.langs = langs;
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
    refetchInterval: 30_000,
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
