import { v } from "convex/values";

// Shared attribute validators (mirror the toward.love website questionnaire).
export const genderV = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("non-binary"),
  v.literal("other"),
);

export const orientationV = v.union(
  v.literal("heterosexual"),
  v.literal("homosexual"),
  v.literal("bisexual"),
  v.literal("pansexual"),
  v.literal("asexual"),
  v.literal("other"),
);

export const relationshipV = v.union(
  v.literal("monogamous"),
  v.literal("non-monogamous"),
  v.literal("other"),
);

export const haveKidsV = v.union(v.literal("yes"), v.literal("no"));

export const wantKidsV = v.union(
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
  v.literal("open"),
);

// Which preferences a user treats as hard requirements (deal-breakers).
export const dealBreakersV = v.object({
  gender: v.boolean(),
  relationship: v.boolean(),
  wantKids: v.boolean(),
  age: v.boolean(),
});

// A user's preferences in a match.
export const prefsV = v.object({
  interestedInGenders: v.array(genderV),
  relationshipTypes: v.array(relationshipV),
  wantKids: v.array(wantKidsV),
  ageMin: v.optional(v.number()),
  ageMax: v.optional(v.number()),
});
