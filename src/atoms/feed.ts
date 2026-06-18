import { atom } from "jotai";

/** URI of the top post currently shown in the home timeline. Compared against the latest
 *  poll to decide whether to show the "new posts" dot on the Home nav icon. */
export const homeTopAtom = atom<string | null>(null);
