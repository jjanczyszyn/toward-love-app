import { mutation, query, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./authHelpers";
import { mutuallyCompatible, ageOf, openTo } from "./matching";

const MAX_BODY = 4000;

function convKey(a: Id<"users">, b: Id<"users">): string {
  return [a, b].sort().join("__");
}

async function isBlockedEitherWay(
  ctx: QueryCtx,
  x: Id<"users">,
  y: Id<"users">,
): Promise<boolean> {
  const a = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blockerId", x).eq("blockedId", y))
    .unique();
  if (a) return true;
  const b = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blockerId", y).eq("blockedId", x))
    .unique();
  return !!b;
}

async function existingIntent(
  ctx: QueryCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<"romantic" | "friend" | null> {
  const first = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationKey", convKey(a, b)))
    .first();
  return first ? (first.intent ?? "romantic") : null;
}

export const send = mutation({
  args: {
    token: v.optional(v.string()),
    toUserId: v.id("users"),
    body: v.string(),
    intent: v.optional(v.union(v.literal("romantic"), v.literal("friend"))),
  },
  handler: async (ctx, { token, toUserId, body, intent }) => {
    const me = await requireUser(ctx, token);
    const text = body.trim();
    if (!text) throw new ConvexError("Message is empty.");
    if (text.length > MAX_BODY) throw new ConvexError("Message is too long.");
    if (toUserId === me._id) throw new ConvexError("You can't message yourself.");

    const recipient = await ctx.db.get(toUserId);
    if (!recipient) throw new ConvexError("That person is no longer here.");

    if (await isBlockedEitherWay(ctx, me._id, toUserId)) {
      throw new ConvexError("You can't message this person.");
    }
    // If the recipient hid me and doesn't allow messages from hidden people.
    const recipientHidMe = await ctx.db
      .query("hides")
      .withIndex("by_pair", (q) =>
        q.eq("hiderId", toUserId).eq("hiddenId", me._id),
      )
      .unique();
    if (recipientHidMe && recipient.hiddenCanMessage !== true) {
      throw new ConvexError(
        "This person isn't accepting messages from you right now.",
      );
    }

    // Intent: existing conversation keeps its intent; otherwise use the chosen one.
    const prior = await existingIntent(ctx, me._id, toUserId);
    const conv = prior ?? intent ?? "romantic";

    if (!prior) {
      if (!openTo(recipient, conv)) {
        throw new ConvexError(
          conv === "friend"
            ? "This person isn't open to friend connections."
            : "This person isn't open to romantic connections.",
        );
      }
      // Deal-breakers only apply to romantic connections.
      if (conv === "romantic" && !mutuallyCompatible(me, recipient)) {
        throw new ConvexError(
          "You don't meet each other's deal-breakers, so romantic messaging is closed.",
        );
      }
    }

    const [a, b] = [me._id, toUserId].sort() as [Id<"users">, Id<"users">];
    await ctx.db.insert("messages", {
      senderId: me._id,
      recipientId: toUserId,
      a,
      b,
      conversationKey: convKey(me._id, toUserId),
      body: text,
      createdAt: Date.now(),
      intent: conv,
    });
    return { ok: true };
  },
});

export const thread = query({
  args: { token: v.optional(v.string()), otherUserId: v.id("users") },
  handler: async (ctx, { token, otherUserId }) => {
    const me = await requireUser(ctx, token);
    const other = await ctx.db.get(otherUserId);
    if (!other) return null;
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationKey", convKey(me._id, otherUserId)),
      )
      .collect();
    const blocked = await isBlockedEitherWay(ctx, me._id, otherUserId);
    const iHid = await ctx.db
      .query("hides")
      .withIndex("by_pair", (q) =>
        q.eq("hiderId", me._id).eq("hiddenId", otherUserId),
      )
      .unique();
    const otherHidMe = await ctx.db
      .query("hides")
      .withIndex("by_pair", (q) =>
        q.eq("hiderId", otherUserId).eq("hiddenId", me._id),
      )
      .unique();
    const hiddenBlocksMe = !!otherHidMe && other.hiddenCanMessage !== true;
    // If I've blocked or hidden them, don't display the conversation at all.
    const concealed = blocked || !!iHid;
    const photo = other.photos[0]
      ? await ctx.storage.getUrl(other.photos[0])
      : (other.externalPhotos?.[0] ?? null);
    const intent = msgs.length ? (msgs[0].intent ?? "romantic") : null;
    const okForIntent = intent === "friend" ? true : mutuallyCompatible(me, other);
    return {
      other: { id: other._id, name: other.name, age: ageOf(other), photoUrl: photo },
      intent,
      canMessage:
        !concealed && !hiddenBlocksMe && (intent === null ? true : okForIntent),
      blocked,
      concealed,
      youHid: !!iHid,
      messages: concealed
        ? []
        : msgs.map((m) => ({
            id: m._id,
            body: m.body,
            createdAt: m.createdAt,
            fromMe: m.senderId === me._id,
          })),
    };
  },
});

export const markRead = mutation({
  args: { token: v.optional(v.string()), otherUserId: v.id("users") },
  handler: async (ctx, { token, otherUserId }) => {
    const me = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", me._id).eq("readAt", undefined),
      )
      .collect();
    const now = Date.now();
    for (const m of unread) {
      if (m.senderId === otherUserId) await ctx.db.patch(m._id, { readAt: now });
    }
    return { ok: true };
  },
});

export const listConversations = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);

    // Don't surface conversations with people I've blocked/hidden (or who blocked me).
    const excluded = new Set<string>();
    for (const b of await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", me._id))
      .collect())
      excluded.add(b.blockedId);
    for (const b of await ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedId", me._id))
      .collect())
      excluded.add(b.blockerId);
    for (const h of await ctx.db
      .query("hides")
      .withIndex("by_hider", (q) => q.eq("hiderId", me._id))
      .collect())
      excluded.add(h.hiddenId);

    const asA = await ctx.db
      .query("messages")
      .withIndex("by_a", (q) => q.eq("a", me._id))
      .collect();
    const asB = await ctx.db
      .query("messages")
      .withIndex("by_b", (q) => q.eq("b", me._id))
      .collect();
    const all = [...asA, ...asB];

    type Acc = {
      otherId: Id<"users">;
      last: Doc<"messages">;
      unread: number;
    };
    const byOther = new Map<string, Acc>();
    for (const m of all) {
      const otherId = m.senderId === me._id ? m.recipientId : m.senderId;
      const cur = byOther.get(otherId);
      const isUnreadToMe = m.recipientId === me._id && m.readAt === undefined;
      if (!cur) {
        byOther.set(otherId, { otherId, last: m, unread: isUnreadToMe ? 1 : 0 });
      } else {
        if (m.createdAt > cur.last.createdAt) cur.last = m;
        if (isUnreadToMe) cur.unread += 1;
      }
    }

    const convos = [];
    for (const acc of byOther.values()) {
      if (excluded.has(acc.otherId)) continue;
      const other = await ctx.db.get(acc.otherId);
      if (!other) continue;
      const photo = other.photos[0]
        ? await ctx.storage.getUrl(other.photos[0])
        : (other.externalPhotos?.[0] ?? null);
      convos.push({
        otherId: acc.otherId,
        name: other.name,
        photoUrl: photo,
        lastBody: acc.last.body,
        lastAt: acc.last.createdAt,
        lastFromMe: acc.last.senderId === me._id,
        unread: acc.unread,
        intent: (acc.last.intent ?? "romantic") as "romantic" | "friend",
      });
    }
    convos.sort((x, y) => y.lastAt - x.lastAt);
    return convos;
  },
});

export const unreadCount = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", me._id).eq("readAt", undefined),
      )
      .collect();
    return unread.length;
  },
});
