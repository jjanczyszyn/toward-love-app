import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  sha256,
  randomToken,
  generateCode,
  normalizeEmail,
  userFromToken,
  adminEmails,
} from "./authHelpers";
import { sendEmailSES } from "./ses";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const RESEND_COOLDOWN_MS = 45 * 1000; // min gap between code requests
const MAX_ATTEMPTS = 6;

// ── Request a login code (sends email via Resend) ───────────────────────────
export const requestCode = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const email = normalizeEmail(args.email);
    const code: string | null = await ctx.runMutation(
      internal.auth.prepareCode,
      { email },
    );
    // code is null when the email isn't approved — respond identically either way.
    if (code) {
      await sendCodeEmail(email, code);
    }
    return { ok: true };
  },
});

async function sendCodeEmail(email: string, code: string) {
  await sendEmailSES({
    to: email,
    subject: `Your toward.love code: ${code}`,
    text: `Your toward.love login code is ${code}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#16131c">
        <p>Your toward.love login code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:4px">${code}</p>
        <p style="color:#6b6577">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>`,
  });
}

// Internal: validate allowlist + rate-limit, store hashed code, return plaintext
// (only to the action, never persisted in clear).
export const prepareCode = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<string | null> => {
    const approved = await ctx.db
      .query("allowlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!approved) return null;

    const existing = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const now = Date.now();
    if (existing && now - existing.createdAt < RESEND_COOLDOWN_MS) {
      throw new ConvexError("Please wait a moment before requesting another code.");
    }

    const code = generateCode();
    const codeHash = await sha256(code);
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("loginCodes", {
      email,
      codeHash,
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      createdAt: now,
    });
    return code;
  },
});

// ── Verify the code and start a session ─────────────────────────────────────
export const verifyCode = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ token: string; onboarded: boolean }> => {
    const email = normalizeEmail(args.email);
    const record = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!record) throw new ConvexError("No code found. Request a new one.");
    if (record.expiresAt < Date.now()) {
      await ctx.db.delete(record._id);
      throw new ConvexError("That code expired. Request a new one.");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await ctx.db.delete(record._id);
      throw new ConvexError("Too many attempts. Request a new code.");
    }
    const codeHash = await sha256(args.code.trim());
    if (codeHash !== record.codeHash) {
      await ctx.db.patch(record._id, { attempts: record.attempts + 1 });
      throw new ConvexError("Incorrect code.");
    }
    await ctx.db.delete(record._id);

    // Find or create the user from the allowlist entry.
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      const approved = await ctx.db
        .query("allowlist")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!approved) throw new ConvexError("This email is not approved.");
      const id = await ctx.db.insert("users", {
        email,
        name: approved.name ?? "",
        onboarded: false,
        createdAt: Date.now(),
        photos: [],
        prefs: {
          interestedInGenders: [],
          relationshipTypes: [],
          wantKids: [],
        },
        dealBreakers: {
          gender: false,
          relationship: false,
          wantKids: false,
          age: false,
        },
      });
      user = (await ctx.db.get(id))!;
    }

    const token = randomToken();
    await ctx.db.insert("sessions", {
      tokenHash: await sha256(token),
      userId: user._id,
      expiresAt: Date.now() + SESSION_TTL_MS,
      createdAt: Date.now(),
    });
    return { token, onboarded: user.onboarded };
  },
});

// ── Current user (safe self view, includes own email) ───────────────────────
export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const user = await userFromToken(ctx, token);
    if (!user) return null;
    return { ...user, isAdmin: adminEmails().includes(user.email) };
  },
});

export const signOut = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return { ok: true };
    const tokenHash = await sha256(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});
