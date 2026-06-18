import type { ReplyTarget } from "@/lib/queries";
import { atom } from "jotai";

export type ComposerState =
  | { open: false }
  | { open: true; reply?: ReplyTarget; replyToHandle?: string };

/** Drives the global post composer modal. Set `open: true` to show it. */
export const composerAtom = atom<ComposerState>({ open: false });
