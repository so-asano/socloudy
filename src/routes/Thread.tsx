import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { Spinner } from "@/components/Spinner";
import { usePostThread } from "@/lib/queries";
import { postUriFromParams } from "@/lib/util";
import { AppBskyFeedDefs } from "@atproto/api";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

type ThreadPost = AppBskyFeedDefs.ThreadViewPost;
type Row = { post: AppBskyFeedDefs.PostView; focused: boolean };

export function ThreadPage() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const uri = postUriFromParams(params["*"] ?? "");
  const { data: thread, isLoading } = usePostThread(uri);

  return (
    <>
      <PageHeader title={t("thread.title")}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="back"
          className="pointer-events-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white bg-sky text-white shadow-lg shadow-sky/20 transition hover:bg-sky-dark"
        >
          <ArrowLeft className="size-5" />
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : thread && AppBskyFeedDefs.isThreadViewPost(thread) ? (
        // flattened into one stack so each post gets the same coverflow scroll as the feed
        <div className="cloud-stack px-4 pt-[36vh] pb-[40vh] sm:px-6">
          {flattenThread(thread).map((row) => (
            <PostCard key={row.post.uri} post={row.post} focused={row.focused} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-zinc-500">{t("thread.notFound")}</p>
      )}
    </>
  );
}

/** Ancestors (oldest → immediate parent), then the focused post, then replies depth-first. */
function flattenThread(node: ThreadPost): Row[] {
  const ancestors: Row[] = [];
  let parent = node.parent;
  while (parent && AppBskyFeedDefs.isThreadViewPost(parent)) {
    ancestors.unshift({ post: parent.post, focused: false });
    parent = parent.parent;
  }
  return [...ancestors, { post: node.post, focused: true }, ...flattenReplies(node)];
}

function flattenReplies(node: ThreadPost): Row[] {
  const rows: Row[] = [];
  for (const reply of node.replies ?? []) {
    if (!AppBskyFeedDefs.isThreadViewPost(reply)) continue;
    rows.push({ post: reply.post, focused: false });
    rows.push(...flattenReplies(reply));
  }
  return rows;
}
