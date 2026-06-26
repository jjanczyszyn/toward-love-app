import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateCode(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return (n[0] % 1_000_000).toString().padStart(6, "0");
}

// As-entered, just trimmed + lowercased (used for display).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Canonical key for matching accounts. Gmail/Googlemail ignore dots in the
// local part (and treat googlemail as gmail), so two dot-variants are the
// same inbox / same account.
export function canonicalEmail(email: string): string {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf("@");
  if (at < 0) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => canonicalEmail(e))
    .filter(Boolean);
}

export async function userFromToken(
  ctx: QueryCtx,
  token: string | undefined,
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  return await ctx.db.get(session.userId);
}

export async function requireUser(
  ctx: QueryCtx,
  token: string | undefined,
): Promise<Doc<"users">> {
  const user = await userFromToken(ctx, token);
  if (!user) throw new ConvexError("Not authenticated. Please sign in again.");
  return user;
}

export async function requireAdmin(
  ctx: MutationCtx | QueryCtx,
  token: string | undefined,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx, token);
  if (!adminEmails().includes(user.email)) {
    throw new ConvexError("Admins only.");
  }
  return user;
}
