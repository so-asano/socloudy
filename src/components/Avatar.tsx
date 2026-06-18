export function Avatar({
  src,
  alt,
  size = 48,
}: {
  src?: string;
  alt?: string;
  size?: number;
}) {
  return (
    <div
      className="box-border shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-zinc-200 dark:bg-zinc-800"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={alt ?? ""} className="size-full object-cover" loading="lazy" />
      ) : null}
    </div>
  );
}
