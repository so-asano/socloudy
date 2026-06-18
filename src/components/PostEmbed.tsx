import { lightboxAtom } from "@/atoms/lightbox";
import { VideoEmbed } from "@/components/VideoEmbed";
import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
} from "@atproto/api";
import { useSetAtom } from "jotai";

/** Render the common post embeds: images, video, external link cards, and quote posts. */
export function PostEmbed({ embed }: { embed: unknown }) {
  if (!embed || typeof embed !== "object") return null;

  if (AppBskyEmbedImages.isView(embed)) {
    return <ImageGrid images={embed.images} />;
  }
  if (AppBskyEmbedVideo.isView(embed)) {
    return <VideoEmbed video={embed} />;
  }
  if (AppBskyEmbedExternal.isView(embed)) {
    return <ExternalCard external={embed.external} />;
  }
  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    return (
      <div className="space-y-2">
        <PostEmbed embed={embed.media} />
        {AppBskyEmbedRecord.isView(embed.record) ? <QuoteCard record={embed.record} /> : null}
      </div>
    );
  }
  if (AppBskyEmbedRecord.isView(embed)) {
    return <QuoteCard record={embed} />;
  }
  return null;
}

function ImageGrid({ images }: { images: AppBskyEmbedImages.ViewImage[] }) {
  const openLightbox = useSetAtom(lightboxAtom);
  return (
    <div
      className={`grid gap-1 overflow-hidden rounded-xl border border-white ${
        images.length > 1 ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {images.map((img) => (
        <button
          key={img.thumb}
          type="button"
          onClick={() => openLightbox(img.fullsize)}
          className="cursor-zoom-in"
        >
          <img
            src={img.thumb}
            alt={img.alt}
            className="aspect-video size-full bg-zinc-100 object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

function ExternalCard({ external }: { external: AppBskyEmbedExternal.ViewExternal }) {
  return (
    <a
      href={external.uri}
      target="_blank"
      rel="noreferrer noopener"
      className="block overflow-hidden rounded-xl border border-white transition hover:bg-zinc-50 dark:border-white dark:hover:bg-zinc-900"
    >
      {external.thumb ? (
        <img src={external.thumb} alt="" className="aspect-video w-full object-cover" />
      ) : null}
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-xs text-zinc-500">{hostOf(external.uri)}</p>
        <p className="line-clamp-2 font-medium text-sm">{external.title}</p>
        <p className="line-clamp-2 text-sm text-zinc-500">{external.description}</p>
      </div>
    </a>
  );
}

function QuoteCard({ record }: { record: AppBskyEmbedRecord.View }) {
  const r = record.record;
  if (!AppBskyEmbedRecord.isViewRecord(r)) return null;
  const value = r.value as { text?: string };
  return (
    <div className="rounded-xl border border-white p-3 text-sm dark:border-white">
      <p className="mb-1 font-medium">
        {r.author.displayName ?? r.author.handle}{" "}
        <span className="font-normal text-zinc-500">@{r.author.handle}</span>
      </p>
      <p className="line-clamp-6 whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
        {value.text}
      </p>
    </div>
  );
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}
