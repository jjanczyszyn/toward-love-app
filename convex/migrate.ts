import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { canonicalEmail } from "./authHelpers";

// Pre-mark allowlisted people (by source) with default romantic attributes,
// creating their profile if they haven't signed in yet. They still complete
// the rest (gender, age, photos) at onboarding; these come pre-filled.
export const markDefaults = internalMutation({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    const defaults = {
      orientation: "heterosexual" as const,
      relationship: "monogamous" as const,
      wantKids: "yes" as const,
    };
    let created = 0;
    let updated = 0;
    for (const r of await ctx.db.query("allowlist").collect()) {
      if (r.source !== source) continue;
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", r.email))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, defaults);
        updated += 1;
      } else {
        await ctx.db.insert("users", {
          email: r.email,
          displayEmail: r.displayEmail,
          name: r.name ?? "",
          onboarded: false,
          createdAt: Date.now(),
          photos: [],
          ...defaults,
          seeking: ["romantic"],
          prefs: { interestedInGenders: [], relationshipTypes: [], wantKids: [] },
          dealBreakers: { gender: false, relationship: false, wantKids: false, age: false },
        });
        created += 1;
      }
    }
    return { created, updated };
  },
});

// One-off: wipe all accounts/messages/seeds and trim the allowlist to the
// given emails only. Use to clear test data before launch.
export const resetForLaunch = internalMutation({
  args: { keepEmails: v.array(v.string()) },
  handler: async (ctx, { keepEmails }) => {
    const keep = new Set(keepEmails.map(canonicalEmail));

    const wipe = async (table: "messages" | "blocks" | "hides" | "sessions" | "loginCodes" | "users") => {
      let n = 0;
      for (const row of await ctx.db.query(table).collect()) {
        await ctx.db.delete(row._id);
        n += 1;
      }
      return n;
    };

    const messages = await wipe("messages");
    const blocks = await wipe("blocks");
    const hides = await wipe("hides");
    const sessions = await wipe("sessions");
    const loginCodes = await wipe("loginCodes");
    const users = await wipe("users");

    let allowlistRemoved = 0;
    let allowlistKept = 0;
    for (const r of await ctx.db.query("allowlist").collect()) {
      if (keep.has(r.email)) allowlistKept += 1;
      else {
        await ctx.db.delete(r._id);
        allowlistRemoved += 1;
      }
    }

    return { messages, blocks, hides, sessions, loginCodes, users, allowlistRemoved, allowlistKept };
  },
});

// One-time: rewrite allowlist/users emails to canonical form (gmail dots
// stripped), preserving the as-entered value in displayEmail, and dropping
// duplicate dot-variants. Clears transient login codes. Idempotent.
export const canonicalizeEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    let allowMerged = 0;
    let usersMerged = 0;

    const allow = await ctx.db.query("allowlist").collect();
    const seenAllow = new Set<string>();
    for (const r of allow) {
      const canon = canonicalEmail(r.email);
      if (seenAllow.has(canon)) {
        await ctx.db.delete(r._id);
        allowMerged += 1;
        continue;
      }
      seenAllow.add(canon);
      if (r.email !== canon || !r.displayEmail) {
        await ctx.db.patch(r._id, {
          email: canon,
          displayEmail: r.displayEmail ?? r.email,
        });
      }
    }

    const users = await ctx.db.query("users").collect();
    const seenUser = new Set<string>();
    for (const u of users) {
      const canon = canonicalEmail(u.email);
      if (seenUser.has(canon)) {
        // Duplicate dot-variant account: remove the extra (keep the first).
        await ctx.db.delete(u._id);
        usersMerged += 1;
        continue;
      }
      seenUser.add(canon);
      if (u.email !== canon || !u.displayEmail) {
        await ctx.db.patch(u._id, {
          email: canon,
          displayEmail: u.displayEmail ?? u.email,
        });
      }
    }

    for (const c of await ctx.db.query("loginCodes").collect()) {
      await ctx.db.delete(c._id);
    }

    return { allowMerged, usersMerged };
  },
});
