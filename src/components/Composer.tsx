import { sessionAtom } from "@/atoms/auth";
import { composerAtom } from "@/atoms/composer";
import { Avatar } from "@/components/Avatar";
import { CloudShape } from "@/components/CloudShape";
import { Spinner } from "@/components/Spinner";
import { useCreatePost } from "@/lib/queries";
import { useAtom, useAtomValue } from "jotai";
import { Image as ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_CHARS = 300;
const MAX_IMAGES = 4;

type ImageItem = { id: string; file: File; url: string; alt: string };

/** Global post/reply composer modal, driven by composerAtom. Supports up to 4 images. */
export function Composer() {
  const { t } = useTranslation();
  const [state, setState] = useAtom(composerAtom);
  const me = useAtomValue(sessionAtom);
  const createPost = useCreatePost();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const open = state.open;
  const isReply = state.open && !!state.reply;

  const reset = () => {
    setText("");
    setError(null);
    setImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.url);
      return [];
    });
  };

  // Reset drafts whenever the modal (re)opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset reads only setters, intentional on open
  useEffect(() => {
    if (open) reset();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState({ open: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setState]);

  if (!state.open) return null;

  const close = () => {
    for (const img of images) URL.revokeObjectURL(img.url);
    setState({ open: false });
  };

  const remaining = MAX_CHARS - text.length;
  const canSubmit =
    (text.trim().length > 0 || images.length > 0) && remaining >= 0 && !createPost.isPending;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => {
      if (prev.length + picked.length > MAX_IMAGES) setError(t("post.tooManyImages"));
      const room = MAX_IMAGES - prev.length;
      const next = picked.slice(0, room).map((file, i) => ({
        id: `${file.name}-${file.size}-${prev.length + i}`,
        file,
        url: URL.createObjectURL(file),
        alt: "",
      }));
      return [...prev, ...next];
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const setAlt = (id: string, alt: string) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, alt } : i)));

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await createPost.mutateAsync({
        text: text.trim(),
        reply: state.reply,
        images: images.map(({ file, alt }) => ({ file, alt })),
      });
      close();
    } catch {
      setError(t("post.failed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <button
        type="button"
        aria-label={t("post.cancel")}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      {/* biome-ignore lint/a11y/useSemanticElements: native <dialog> doesn't fit this controlled atom-driven modal */}
      <div role="dialog" aria-modal="true" className="cloud-card is-modal relative w-full">
        <CloudShape seed={4242} />
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={close}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t("post.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-full bg-sky px-4 py-1.5 font-semibold text-sm text-white transition enabled:hover:bg-sky-dark disabled:opacity-50"
            >
              {createPost.isPending ? <Spinner className="size-5 text-white" /> : null}
              {createPost.isPending ? t("post.submitting") : t("post.submit")}
            </button>
          </div>

          {isReply && state.open ? (
            <p className="mb-2 text-sm text-zinc-500">
              {t("post.replyingTo", { handle: `@${state.replyToHandle}` })}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Avatar src={me?.avatar} alt={me?.handle} size={40} />
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isReply ? t("post.replyPlaceholder") : t("post.placeholder")}
              rows={4}
              className="flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
            />
          </div>

          {images.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-xl border border-white dark:border-white"
                >
                  <div className="relative">
                    <img src={img.url} alt={img.alt} className="aspect-video w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      aria-label={t("post.removeImage")}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={img.alt}
                    onChange={(e) => setAlt(img.id, e.target.value)}
                    placeholder={t("post.altPlaceholder")}
                    aria-label={t("post.altText")}
                    className="w-full border-white border-t bg-transparent px-2 py-1.5 text-xs outline-none dark:border-white"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          <div className="mt-3 flex items-center justify-between border-white border-t pt-3 dark:border-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                aria-label={t("post.addImage")}
                className="grid size-9 place-items-center rounded-full text-sky transition hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
              >
                <ImageIcon className="size-5" />
              </button>
              {error ? <span className="text-red-500 text-sm">{error}</span> : null}
            </div>
            <span
              className={`text-sm tabular-nums ${remaining < 0 ? "text-red-500" : "text-zinc-500"}`}
            >
              {t("post.charsLeft", { count: remaining })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
