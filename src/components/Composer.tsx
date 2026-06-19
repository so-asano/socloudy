import { sessionAtom } from "@/atoms/auth";
import { composerAtom } from "@/atoms/composer";
import { Avatar } from "@/components/Avatar";
import { CloudShape } from "@/components/CloudShape";
import { Spinner } from "@/components/Spinner";
import { useCreatePost } from "@/lib/queries";
import { RichText } from "@atproto/api";
import { useAtom, useAtomValue } from "jotai";
import { ChevronDown, Image as ImageIcon, Languages, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_CHARS = 300;
const MAX_IMAGES = 4;

// Languages offered for tagging a post (BCP-47), with native labels.
const POST_LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
] as const;

type ImageItem = { id: string; file: File; url: string; alt: string };

/** Global post/reply composer modal, driven by composerAtom. Supports up to 4 images. */
export function Composer() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useAtom(composerAtom);
  const me = useAtomValue(sessionAtom);
  const createPost = useCreatePost();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  // default the post language to the current UI language
  const [lang, setLang] = useState(() => i18n.resolvedLanguage ?? "en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);

  // Live rich text: detect facets locally (no network) for highlighting, and
  // count by graphemes (the real post limit) rather than UTF-16 length.
  const rt = useMemo(() => {
    const r = new RichText({ text });
    r.detectFacetsWithoutResolution();
    return r;
  }, [text]);

  const open = state.open;
  const isReply = state.open && !!state.reply;

  const reset = () => {
    setText("");
    setError(null);
    setLang(i18n.resolvedLanguage ?? "en");
    setLangMenuOpen(false);
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
      // ignore Escape used to cancel an IME conversion (isComposing / keyCode 229)
      if (e.key === "Escape" && !e.isComposing && e.keyCode !== 229) {
        setState({ open: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setState]);

  if (!state.open) return null;

  const close = () => {
    for (const img of images) URL.revokeObjectURL(img.url);
    setState({ open: false });
  };

  const remaining = MAX_CHARS - rt.graphemeLength;
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
        langs: [lang],
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
            <div className="relative flex-1">
              {/* highlight overlay: mirrors the textarea, colouring detected facets */}
              <div
                ref={backdrop}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-6 [overflow-wrap:anywhere]"
              >
                {Array.from(rt.segments()).map((seg, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and re-derived each render
                    key={i}
                    className={seg.mention || seg.link || seg.tag ? "text-sky" : undefined}
                  >
                    {seg.text}
                  </span>
                ))}
                {"​"}
              </div>
              <textarea
                ref={textarea}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onScroll={() => {
                  if (backdrop.current && textarea.current) {
                    backdrop.current.scrollTop = textarea.current.scrollTop;
                  }
                }}
                placeholder={isReply ? t("post.replyPlaceholder") : t("post.placeholder")}
                rows={4}
                className="relative block w-full resize-none overflow-auto bg-transparent text-[15px] text-transparent leading-6 caret-zinc-900 outline-none placeholder:text-zinc-400 [overflow-wrap:anywhere] dark:caret-zinc-100"
              />
            </div>
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((v) => !v)}
                  aria-label={t("post.language")}
                  aria-haspopup="listbox"
                  aria-expanded={langMenuOpen}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-sky text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Languages className="size-5 shrink-0" />
                  {POST_LANGUAGES.find((l) => l.code === lang)?.label ?? lang}
                  <ChevronDown className="size-4 shrink-0" />
                </button>
                {langMenuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label={t("common.close")}
                      onClick={() => setLangMenuOpen(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <ul className="absolute bottom-full left-0 z-20 mb-2 max-h-60 w-36 overflow-y-auto rounded-2xl border border-black/10 bg-white py-1 text-zinc-900 shadow-xl dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
                      {POST_LANGUAGES.map((l) => (
                        <li key={l.code}>
                          <button
                            type="button"
                            onClick={() => {
                              setLang(l.code);
                              setLangMenuOpen(false);
                            }}
                            className={`flex w-full items-center px-3 py-1.5 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              l.code === lang ? "font-semibold text-sky" : ""
                            }`}
                          >
                            {l.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
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
