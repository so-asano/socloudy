import { atom } from "jotai";

/** Fullsize image URLs shown in the lightbox and the current index, or null when closed. */
export type LightboxState = { images: string[]; index: number };
export const lightboxAtom = atom<LightboxState | null>(null);
