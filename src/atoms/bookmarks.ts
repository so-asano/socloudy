import { atomWithStorage } from "jotai/utils";

/** Bookmarked post URIs, newest first. Stored locally (AT Proto has no public bookmark API). */
export const bookmarksAtom = atomWithStorage<string[]>("socloudy.bookmarks", []);
