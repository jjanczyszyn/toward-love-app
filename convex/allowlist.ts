import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, normalizeEmail, canonicalEmail } from "./authHelpers";

const entryV = v.object({
  email: v.string(),
  name: v.optional(v.string()),
  source: v.optional(v.string()),
});

async function upsert(
  ctx: any,
  e: { email: string; name?: string; source?: string },
) {
  const email = canonicalEmail(e.email);
  const display = normalizeEmail(e.email);
  if (!email.includes("@")) return false;
  const existing = await ctx.db
    .query("allowlist")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: e.name ?? existing.name,
      source: e.source ?? existing.source,
      displayEmail: existing.displayEmail ?? display,
    });
    return false;
  }
  await ctx.db.insert("allowlist", {
    email,
    displayEmail: display,
    name: e.name,
    source: e.source,
    addedAt: Date.now(),
  });
  return true;
}

export const add = mutation({
  args: { token: v.optional(v.string()), entries: v.array(entryV) },
  handler: async (ctx, { token, entries }) => {
    await requireAdmin(ctx, token);
    let added = 0;
    for (const e of entries) if (await upsert(ctx, e)) added += 1;
    return { added, total: entries.length };
  },
});

export const remove = mutation({
  args: { token: v.optional(v.string()), email: v.string() },
  handler: async (ctx, { token, email }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db
      .query("allowlist")
      .withIndex("by_email", (q) => q.eq("email", canonicalEmail(email)))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return { ok: true };
  },
});

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("allowlist").collect();
    const out = [];
    for (const r of rows) {
      const u = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", r.email))
        .unique();
      out.push({
        email: r.displayEmail ?? r.email,
        name: r.name ?? u?.name ?? "",
        source: r.source ?? null,
        hasAccount: !!u,
        onboarded: u?.onboarded ?? false,
      });
    }
    out.sort((a, b) => a.email.localeCompare(b.email));
    return out;
  },
});

// Seeding entry point used by the import script (admin key required to run).
export const bulkImport = internalMutation({
  args: { entries: v.array(entryV) },
  handler: async (ctx, { entries }) => {
    let added = 0;
    for (const e of entries) if (await upsert(ctx, e)) added += 1;
    return { added, total: entries.length };
  },
});
