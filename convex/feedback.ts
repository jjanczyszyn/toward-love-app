import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser, requireAdmin } from "./authHelpers";

export const submit = mutation({
  args: {
    token: v.optional(v.string()),
    message: v.string(),
    screenshotId: v.optional(v.id("_storage")),
    context: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token);
    const message = args.message.trim();
    if (!message && !args.screenshotId) {
      throw new ConvexError("Please add a note or a screenshot.");
    }
    await ctx.db.insert("feedback", {
      userId: user._id,
      email: user.displayEmail ?? user.email,
      message,
      screenshotId: args.screenshotId,
      context: args.context?.slice(0, 300),
      userAgent: args.userAgent?.slice(0, 300),
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200);
    const out = [];
    for (const r of rows) {
      const user = await ctx.db.get(r.userId);
      out.push({
        id: r._id,
        from: user?.name || r.email,
        email: r.email,
        message: r.message,
        context: r.context ?? null,
        createdAt: r.createdAt,
        screenshotUrl: r.screenshotId
          ? await ctx.storage.getUrl(r.screenshotId)
          : null,
      });
    }
    return out;
  },
});
