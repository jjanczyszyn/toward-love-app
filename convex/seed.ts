import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authHelpers";

const noDeal = { gender: false, relationship: false, wantKids: false, age: false };

type Seed = {
  name: string;
  birthYear: number;
  gender: "male" | "female" | "non-binary" | "other";
  orientation:
    | "heterosexual"
    | "homosexual"
    | "bisexual"
    | "pansexual"
    | "asexual"
    | "other";
  relationship: "monogamous" | "non-monogamous" | "other";
  haveKids: "yes" | "no";
  wantKids: "yes" | "no" | "maybe" | "open";
  location: string;
  bio: string;
  img: number;
  interestedInGenders: ("male" | "female" | "non-binary" | "other")[];
};

const SEEDS: Seed[] = [
  { name: "Maya", birthYear: 1992, gender: "female", orientation: "heterosexual", relationship: "monogamous", haveKids: "no", wantKids: "yes", location: "San Francisco", bio: "Ceramicist and trail runner. Looking for something that lasts.", img: 5, interestedInGenders: ["male"] },
  { name: "Daniel", birthYear: 1988, gender: "male", orientation: "heterosexual", relationship: "monogamous", haveKids: "no", wantKids: "yes", location: "Oakland", bio: "Engineer who cooks too much. Want a real partnership and a family one day.", img: 12, interestedInGenders: ["female"] },
  { name: "Priya", birthYear: 1990, gender: "female", orientation: "bisexual", relationship: "monogamous", haveKids: "no", wantKids: "maybe", location: "Berkeley", bio: "Therapist, big reader, slow mornings. Curious and kind.", img: 9, interestedInGenders: ["male", "female"] },
  { name: "Marcus", birthYear: 1985, gender: "male", orientation: "heterosexual", relationship: "non-monogamous", haveKids: "yes", wantKids: "no", location: "San Francisco", bio: "Dad of one, musician, ENM. Honest and easygoing.", img: 13, interestedInGenders: ["female"] },
  { name: "Sofia", birthYear: 1995, gender: "female", orientation: "pansexual", relationship: "non-monogamous", haveKids: "no", wantKids: "open", location: "San Francisco", bio: "Dancer and community organizer. Love deeply, live freely.", img: 16, interestedInGenders: ["male", "female", "non-binary"] },
  { name: "Aiden", birthYear: 1991, gender: "male", orientation: "homosexual", relationship: "monogamous", haveKids: "no", wantKids: "maybe", location: "San Francisco", bio: "Architect, climber, dog person. Building a life with intention.", img: 33, interestedInGenders: ["male"] },
  { name: "Leah", birthYear: 1987, gender: "female", orientation: "heterosexual", relationship: "monogamous", haveKids: "yes", wantKids: "no", location: "Marin", bio: "Mom, designer, ocean swimmer. Ready for a grounded partnership.", img: 20, interestedInGenders: ["male"] },
  { name: "Theo", birthYear: 1993, gender: "male", orientation: "bisexual", relationship: "monogamous", haveKids: "no", wantKids: "yes", location: "Oakland", bio: "Chef and gardener. Family-oriented and a hopeless romantic.", img: 52, interestedInGenders: ["female", "non-binary"] },
  { name: "Riley", birthYear: 1996, gender: "non-binary", orientation: "pansexual", relationship: "non-monogamous", haveKids: "no", wantKids: "no", location: "San Francisco", bio: "Artist and facilitator. Here for depth, play, and honesty.", img: 47, interestedInGenders: ["female", "non-binary", "male"] },
  { name: "Hannah", birthYear: 1989, gender: "female", orientation: "heterosexual", relationship: "monogamous", haveKids: "no", wantKids: "yes", location: "San Jose", bio: "Doctor, hiker, terrible at small talk but great at the real stuff.", img: 24, interestedInGenders: ["male"] },
];

export const seedFakeProfiles = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    let created = 0;
    for (let i = 0; i < SEEDS.length; i++) {
      const s = SEEDS[i];
      const email = `seed${i + 1}@demo.toward.love`;
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (existing) continue;
      await ctx.db.insert("users", {
        email,
        name: s.name,
        onboarded: true,
        createdAt: Date.now(),
        birthYear: s.birthYear,
        gender: s.gender,
        orientation: s.orientation,
        relationship: s.relationship,
        haveKids: s.haveKids,
        wantKids: s.wantKids,
        locations: [s.location],
        bio: s.bio,
        photos: [],
        externalPhotos: [`https://i.pravatar.cc/480?img=${s.img}`],
        isSeed: true,
        seeking: i % 4 === 0 ? ["romantic"] : ["romantic", "friend"],
        prefs: {
          interestedInGenders: s.interestedInGenders,
          relationshipTypes: [],
          wantKids: [],
        },
        dealBreakers: noDeal,
      });
      created += 1;
    }
    return { created };
  },
});

export const deleteSeedProfiles = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const all = await ctx.db.query("users").collect();
    const seeds = all.filter((u) => u.isSeed);
    for (const u of seeds) {
      for (const m of await ctx.db
        .query("messages")
        .withIndex("by_a", (q) => q.eq("a", u._id))
        .collect())
        await ctx.db.delete(m._id);
      for (const m of await ctx.db
        .query("messages")
        .withIndex("by_b", (q) => q.eq("b", u._id))
        .collect())
        await ctx.db.delete(m._id);
      for (const b of await ctx.db
        .query("blocks")
        .withIndex("by_blocker", (q) => q.eq("blockerId", u._id))
        .collect())
        await ctx.db.delete(b._id);
      for (const b of await ctx.db
        .query("blocks")
        .withIndex("by_blocked", (q) => q.eq("blockedId", u._id))
        .collect())
        await ctx.db.delete(b._id);
      for (const h of await ctx.db
        .query("hides")
        .withIndex("by_hider", (q) => q.eq("hiderId", u._id))
        .collect())
        await ctx.db.delete(h._id);
      for (const h of await ctx.db
        .query("hides")
        .withIndex("by_hidden", (q) => q.eq("hiddenId", u._id))
        .collect())
        await ctx.db.delete(h._id);
      for (const sn of await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect())
        await ctx.db.delete(sn._id);
      await ctx.db.delete(u._id);
    }
    return { deleted: seeds.length };
  },
});
