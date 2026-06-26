import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./authHelpers";

export const block = mutation({
  args: { token: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { token, userId }) => {
    const me = await requireUser(ctx, token);
    if (userId === me._id) throw new ConvexError("You can't block yourself.");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", userId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("blocks", {
        blockerId: me._id,
        blockedId: userId,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const unblock = mutation({
  args: { token: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { token, userId }) => {
    const me = await requireUser(ctx, token);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", me._id).eq("blockedId", userId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const listBlocked = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", me._id))
      .collect();
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.blockedId);
      if (u) out.push({ id: u._id, name: u.name });
    }
    return out;
  },
});
