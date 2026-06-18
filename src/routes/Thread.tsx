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
          className="grid size-8 place-items-center rounded-full transition hover:bg-white/25"
        >
          <ArrowLeft className="size-5" />
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : thread && AppBskyFeedDefs.isThreadViewPost(thread) ? (
        <div className="space-y-10 p-4 pt-8 sm:px-6">
          <ThreadView node={thread} focused />
        </div>
      ) : (
        <p className="py-16 text-center text-zinc-500">{t("thread.notFound")}</p>
      )}
    </>
  );
}

function ThreadView({ node, focused = false }: { node: ThreadPost; focused?: boolean }) {
  const parent = node.parent && AppBskyFeedDefs.isThreadViewPost(node.parent) ? node.parent : null;
  const replies = (node.replies ?? []).filter(AppBskyFeedDefs.isThreadViewPost);

  return (
    <div className="space-y-10">
      {parent ? <ThreadView node={parent} /> : null}
      <PostCard post={node.post} focused={focused} />
      {/* focused styling handled inside PostCard via the cloud-card--focused class */}
      {replies.map((reply) => (
        <ThreadView key={reply.post.uri} node={reply} />
      ))}
    </div>
  );
}
