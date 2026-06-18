/**
 * Locale-aware relative time via Intl.RelativeTimeFormat ("3分前" / "3 min. ago").
 * Falls back to a localized date for anything older than ~30 days.
 */
export function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(0, (Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  if (sec < 60) return rtf.format(-Math.floor(sec), "second");
  if (sec < 3600) return rtf.format(-Math.floor(sec / 60), "minute");
  if (sec < 86400) return rtf.format(-Math.floor(sec / 3600), "hour");
  if (sec < 86400 * 30) return rtf.format(-Math.floor(sec / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Turn an at:// post URI into the app's thread path.
 * at://did/app.bsky.feed.post/rkey -> /thread/did/rkey
 */
export function threadPath(uri: string): string {
  const m = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!m) return "/";
  return `/thread/${m[1]}/${m[2]}`;
}

/** Stable numeric seed from a post's cid, so each post's cloud has its own fixed shape. */
export function cloudSeed(cid: string): number {
  let h = 0;
  for (let i = 0; i < cid.length; i++) {
    h = (h * 31 + cid.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 100000) + 1;
}

/** Rebuild an at:// post URI from the thread path params. */
export function postUriFromParams(splat: string): string {
  const [did, rkey] = splat.split("/");
  return `at://${did}/app.bsky.feed.post/${rkey}`;
}
