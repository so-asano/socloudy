import { atom } from "jotai";

/** Fullsize image URL shown in the lightbox overlay, or null when closed. */
export const lightboxAtom = atom<string | null>(null);
