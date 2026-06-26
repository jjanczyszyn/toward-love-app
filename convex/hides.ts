import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./authHelpers";

export const hide = mutation({
  args: { token: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { token, userId }) => {
    const me = await requireUser(ctx, token);
    if (userId === me._id) throw new ConvexError("You can't hide yourself.");
    const existing = await ctx.db
      .query("hides")
      .withIndex("by_pair", (q) =>
        q.eq("hiderId", me._id).eq("hiddenId", userId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("hides", {
        hiderId: me._id,
        hiddenId: userId,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const unhide = mutation({
  args: { token: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, { token, userId }) => {
    const me = await requireUser(ctx, token);
    const existing = await ctx.db
      .query("hides")
      .withIndex("by_pair", (q) =>
        q.eq("hiderId", me._id).eq("hiddenId", userId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const listHidden = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const rows = await ctx.db
      .query("hides")
      .withIndex("by_hider", (q) => q.eq("hiderId", me._id))
      .collect();
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.hiddenId);
      if (u) out.push({ id: u._id, name: u.name });
    }
    return out;
  },
});
