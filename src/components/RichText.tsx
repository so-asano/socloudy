import { type AppBskyRichtextFacet, RichText as RichTextHelper } from "@atproto/api";
import { Fragment } from "react";
import { Link } from "react-router-dom";

/**
 * Render post text honoring AT Protocol facets (links, mentions, hashtags).
 * Mentions route into the app; links open in a new tab.
 */
export function RichText({
  text,
  facets,
}: {
  text: string;
  facets?: AppBskyRichtextFacet.Main[];
}) {
  const rt = new RichTextHelper({ text, facets });
  const nodes: React.ReactNode[] = [];
  let i = 0;

  for (const seg of rt.segments()) {
    const key = `${i++}`;
    const mention = seg.mention?.did;
    const link = seg.link?.uri;
    const tag = seg.tag?.tag;

    if (mention) {
      nodes.push(
        <Link
          key={key}
          to={`/profile/${mention}`}
          className="relative z-10 text-sky hover:underline"
        >
          {seg.text}
        </Link>,
      );
    } else if (link) {
      nodes.push(
        <a
          key={key}
          href={link}
          target="_blank"
          rel="noreferrer noopener"
          className="relative z-10 text-sky hover:underline"
        >
          {seg.text}
        </a>,
      );
    } else if (tag) {
      nodes.push(
        <span key={key} className="text-sky">
          {seg.text}
        </span>,
      );
    } else {
      nodes.push(<Fragment key={key}>{seg.text}</Fragment>);
    }
  }

  // overflow-wrap:anywhere breaks long unbroken tokens (e.g. URLs) so nothing overflows.
  return <p className="[overflow-wrap:anywhere] whitespace-pre-wrap break-words">{nodes}</p>;
}
