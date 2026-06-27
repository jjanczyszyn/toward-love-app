import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  genderV,
  orientationV,
  relationshipV,
  haveKidsV,
  wantKidsV,
  dealBreakersV,
  prefsV,
} from "./validators";

export default defineSchema({
  // Preapproved emails. Only these can request a login code.
  allowlist: defineTable({
    email: v.string(), // canonical key (gmail dots stripped)
    displayEmail: v.optional(v.string()), // as entered
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    addedAt: v.number(),
  }).index("by_email", ["email"]),

  // One row per logged-in member. `email` is PRIVATE and never returned to
  // other users.
  users: defineTable({
    email: v.string(), // canonical key (gmail dots stripped)
    displayEmail: v.optional(v.string()), // as entered
    name: v.string(),
    onboarded: v.boolean(),
    createdAt: v.number(),

    // Profile
    birthYear: v.optional(v.number()),
    gender: v.optional(genderV),
    orientation: v.optional(orientationV),
    relationship: v.optional(relationshipV),
    haveKids: v.optional(haveKidsV),
    wantKids: v.optional(wantKidsV),
    relationships: v.optional(v.array(relationshipV)),
    relationshipOther: v.optional(v.string()),
    location: v.optional(v.string()), // legacy single location (back-compat)
    locations: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    photos: v.array(v.id("_storage")),
    // Demo/seed profiles use external placeholder image URLs (real members
    // upload to storage). Lets us seed faces without uploads.
    externalPhotos: v.optional(v.array(v.string())),
    isSeed: v.optional(v.boolean()),

    // Match preferences + which are deal-breakers
    prefs: prefsV,
    dealBreakers: dealBreakersV,

    // If true, people you've hidden from matches can still message you.
    hiddenCanMessage: v.optional(v.boolean()),

    // What this person is open to. Undefined = romantic only (back-compat).
    seeking: v.optional(
      v.array(v.union(v.literal("romantic"), v.literal("friend"))),
    ),
  }).index("by_email", ["email"]),

  // Login codes (one active per email; replaced on re-request).
  loginCodes: defineTable({
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Opaque session tokens (hashed at rest).
  sessions: defineTable({
    tokenHash: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_user", ["userId"]),

  // 1:1 messages. `a`/`b` are the sorted participant ids for grouping.
  messages: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    a: v.id("users"),
    b: v.id("users"),
    conversationKey: v.string(),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    // romantic | friend. Undefined = romantic (back-compat).
    intent: v.optional(v.union(v.literal("romantic"), v.literal("friend"))),
  })
    .index("by_conversation", ["conversationKey", "createdAt"])
    .index("by_a", ["a"])
    .index("by_b", ["b"])
    .index("by_recipient_unread", ["recipientId", "readAt"]),

  // Blocks (mutual effect; messaging disabled if either side blocks, and each
  // disappears from the other's browse).
  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),

  // Bug reports / feedback from members.
  feedback: defineTable({
    userId: v.id("users"),
    email: v.string(),
    message: v.string(),
    screenshotId: v.optional(v.id("_storage")),
    context: v.optional(v.string()), // current view/URL
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  // Hides (one-way: hidden person is removed from the hider's matches; whether
  // they can still message the hider depends on the hider's hiddenCanMessage).
  hides: defineTable({
    hiderId: v.id("users"),
    hiddenId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_hider", ["hiderId"])
    .index("by_hidden", ["hiddenId"])
    .index("by_pair", ["hiderId", "hiddenId"]),
});
