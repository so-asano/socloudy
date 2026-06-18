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

  // Single image: show it at its own aspect ratio (capped in height) instead of cropping.
  if (images.length === 1) {
    const img = images[0];
    if (!img) return null;
    const ratio = img.aspectRatio
      ? `${img.aspectRatio.width} / ${img.aspectRatio.height}`
      : "16 / 9";
    return (
      <button
        type="button"
        onClick={() => openLightbox(img.fullsize)}
        className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-white"
      >
        <img
          src={img.thumb}
          alt={img.alt}
          style={{ aspectRatio: ratio }}
          className="max-h-[70vh] w-full bg-zinc-100 object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  // Multiple images: uniform tiles in a 2-column grid.
  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-white">
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
            className="aspect-square size-full bg-zinc-100 object-cover"
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
      className="block overflow-hidden rounded-xl bg-black/[0.06] transition hover:bg-black/[0.1] dark:bg-white/10 dark:hover:bg-white/[0.16]"
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
  const images = quotedImages(r.embeds);
  return (
    <div className="space-y-2 rounded-xl bg-black/[0.06] p-3 text-sm dark:bg-white/10">
      <div>
        <p className="mb-1 font-medium">
          {r.author.displayName ?? r.author.handle}{" "}
          <span className="font-normal text-zinc-500">@{r.author.handle}</span>
        </p>
        <p className="line-clamp-6 whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
          {value.text}
        </p>
      </div>
      {images.length > 0 ? (
        <div
          className={`grid gap-1 overflow-hidden rounded-lg ${
            images.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {images.slice(0, 4).map((img) => (
            <img
              key={img.thumb}
              src={img.thumb}
              alt={img.alt}
              className={`w-full bg-zinc-100 object-cover ${
                images.length > 1 ? "aspect-square" : "max-h-72"
              }`}
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Pull the image views out of a quoted record's embeds (direct or record-with-media). */
function quotedImages(embeds: unknown): AppBskyEmbedImages.ViewImage[] {
  if (!Array.isArray(embeds)) return [];
  for (const e of embeds) {
    if (AppBskyEmbedImages.isView(e)) return e.images;
    if (AppBskyEmbedRecordWithMedia.isView(e) && AppBskyEmbedImages.isView(e.media)) {
      return e.media.images;
    }
  }
  return [];
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}
