import { internalMutation } from "./_generated/server";
import { canonicalEmail } from "./authHelpers";

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
