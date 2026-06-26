import { ConvexError } from "convex/values";

// Convex masks plain Error messages in production; ConvexError carries a
// readable `data` payload we can show the user.
export function getErr(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ConvexError) {
    return typeof e.data === "string" ? e.data : fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
