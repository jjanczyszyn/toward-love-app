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
    email: v.string(), // lowercased
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    addedAt: v.number(),
  }).index("by_email", ["email"]),

  // One row per logged-in member. `email` is PRIVATE and never returned to
  // other users.
  users: defineTable({
    email: v.string(),
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
    location: v.optional(v.string()),
    bio: v.optional(v.string()),
    photos: v.array(v.id("_storage")),

    // Match preferences + which are deal-breakers
    prefs: prefsV,
    dealBreakers: dealBreakersV,
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
  })
    .index("by_conversation", ["conversationKey", "createdAt"])
    .index("by_a", ["a"])
    .index("by_b", ["b"])
    .index("by_recipient_unread", ["recipientId", "readAt"]),

  // Blocks (directional; messaging is disabled if either side blocks).
  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),
});
