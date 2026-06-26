import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./authHelpers";
import {
  genderV,
  orientationV,
  relationshipV,
  haveKidsV,
  wantKidsV,
  prefsV,
  dealBreakersV,
} from "./validators";
import { ageOf, candidatePassesViewer, mutuallyCompatible } from "./matching";

async function photoUrls(ctx: QueryCtx, u: Doc<"users">) {
  const urls = await Promise.all(u.photos.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((x): x is string => !!x);
}

// Public profile: NEVER includes email.
async function toPublic(ctx: QueryCtx, u: Doc<"users">) {
  return {
    id: u._id,
    name: u.name,
    age: ageOf(u),
    gender: u.gender ?? null,
    orientation: u.orientation ?? null,
    relationship: u.relationship ?? null,
    haveKids: u.haveKids ?? null,
    wantKids: u.wantKids ?? null,
    location: u.location ?? null,
    bio: u.bio ?? null,
    photoUrls: await photoUrls(ctx, u),
  };
}

// Set of users blocked-by-me and who-blocked-me.
async function blockSets(ctx: QueryCtx, meId: Id<"users">) {
  const iBlocked = await ctx.db
    .query("blocks")
    .withIndex("by_blocker", (q) => q.eq("blockerId", meId))
    .collect();
  const blockedMe = await ctx.db
    .query("blocks")
    .withIndex("by_blocked", (q) => q.eq("blockedId", meId))
    .collect();
  const set = new Set<string>();
  iBlocked.forEach((b) => set.add(b.blockedId));
  blockedMe.forEach((b) => set.add(b.blockerId));
  return set;
}

export const updateProfile = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.optional(v.string()),
    birthYear: v.optional(v.number()),
    gender: v.optional(genderV),
    orientation: v.optional(orientationV),
    relationship: v.optional(relationshipV),
    haveKids: v.optional(haveKidsV),
    wantKids: v.optional(wantKidsV),
    location: v.optional(v.string()),
    bio: v.optional(v.string()),
    prefs: v.optional(prefsV),
    dealBreakers: v.optional(dealBreakersV),
    markOnboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const patch: Partial<Doc<"users">> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.birthYear !== undefined) patch.birthYear = args.birthYear;
    if (args.gender !== undefined) patch.gender = args.gender;
    if (args.orientation !== undefined) patch.orientation = args.orientation;
    if (args.relationship !== undefined) patch.relationship = args.relationship;
    if (args.haveKids !== undefined) patch.haveKids = args.haveKids;
    if (args.wantKids !== undefined) patch.wantKids = args.wantKids;
    if (args.location !== undefined) patch.location = args.location.trim();
    if (args.bio !== undefined) patch.bio = args.bio.trim();
    if (args.prefs !== undefined) patch.prefs = args.prefs;
    if (args.dealBreakers !== undefined) patch.dealBreakers = args.dealBreakers;
    if (args.markOnboarded) patch.onboarded = true;
    await ctx.db.patch(user._id, patch);
    return { ok: true };
  },
});

// My own full record (with photo URLs), for editing.
export const myProfile = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    return {
      ...user,
      photoUrls: await photoUrls(ctx, user),
    };
  },
});

const filtersV = v.object({
  genders: v.optional(v.array(genderV)),
  relationships: v.optional(v.array(relationshipV)),
  wantKids: v.optional(v.array(wantKidsV)),
  haveKids: v.optional(haveKidsV),
  ageMin: v.optional(v.number()),
  ageMax: v.optional(v.number()),
  hasPhoto: v.optional(v.boolean()),
  search: v.optional(v.string()),
  onlyCompatible: v.optional(v.boolean()),
});

export const browse = query({
  args: { token: v.optional(v.string()), filters: v.optional(filtersV) },
  handler: async (ctx, { token, filters }) => {
    const me = await requireUser(ctx, token);
    const blocked = await blockSets(ctx, me._id);
    const f = filters ?? {};

    const all = await ctx.db.query("users").collect();
    const results = [];
    for (const u of all) {
      if (u._id === me._id) continue;
      if (!u.onboarded) continue;
      if (blocked.has(u._id)) continue;

      const age = ageOf(u);
      if (f.genders?.length && (!u.gender || !f.genders.includes(u.gender)))
        continue;
      if (
        f.relationships?.length &&
        (!u.relationship || !f.relationships.includes(u.relationship))
      )
        continue;
      if (f.wantKids?.length && (!u.wantKids || !f.wantKids.includes(u.wantKids)))
        continue;
      if (f.haveKids && u.haveKids !== f.haveKids) continue;
      if (f.ageMin !== undefined && (age === null || age < f.ageMin)) continue;
      if (f.ageMax !== undefined && (age === null || age > f.ageMax)) continue;
      if (f.hasPhoto && u.photos.length === 0) continue;
      if (f.search) {
        const q = f.search.toLowerCase();
        const hay = `${u.name} ${u.bio ?? ""} ${u.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      const compatible = mutuallyCompatible(me, u);
      if (f.onlyCompatible && !compatible) continue;

      results.push({
        ...(await toPublic(ctx, u)),
        compatible,
        canMessage: compatible, // not blocked (filtered above)
      });
    }
    // Compatible first, then by name.
    results.sort((a, b) =>
      a.compatible === b.compatible
        ? a.name.localeCompare(b.name)
        : a.compatible
          ? -1
          : 1,
    );
    return results;
  },
});

export const getProfile = query({
  args: { token: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { token, userId }) => {
    const me = await requireUser(ctx, token);
    const u = await ctx.db.get(userId);
    if (!u) return null;
    const blocked = await blockSets(ctx, me._id);
    const iBlocked = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", userId),
      )
      .unique();
    const compatible = mutuallyCompatible(me, u);
    return {
      ...(await toPublic(ctx, u)),
      compatible,
      canMessage: compatible && !blocked.has(userId),
      youBlocked: !!iBlocked,
      // Explain which of MY deal-breakers they fail, for transparency.
      passesMine: candidatePassesViewer(me, u),
      passesTheirs: candidatePassesViewer(u, me),
    };
  },
});
