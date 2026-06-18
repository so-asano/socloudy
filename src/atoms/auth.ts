import type { AppBskyActorDefs } from "@atproto/api";
import { atom } from "jotai";

/** The logged-in user's profile, or null when signed out. Source of truth for auth UI. */
export const sessionAtom = atom<AppBskyActorDefs.ProfileViewDetailed | null>(null);

export const isAuthedAtom = atom((get) => get(sessionAtom) !== null);
