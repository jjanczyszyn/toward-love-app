import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./authHelpers";

const MAX_PHOTOS = 6;

// Returns a short-lived URL the client POSTs the image to.
export const generateUploadUrl = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

// Attach an uploaded file to the current user's photos.
export const addPhoto = mutation({
  args: { token: v.optional(v.string()), storageId: v.id("_storage") },
  handler: async (ctx, { token, storageId }) => {
    const user = await requireUser(ctx, token);
    if (user.photos.length >= MAX_PHOTOS) {
      await ctx.storage.delete(storageId);
      throw new ConvexError(`You can have at most ${MAX_PHOTOS} photos.`);
    }
    await ctx.db.patch(user._id, { photos: [...user.photos, storageId] });
    return { ok: true };
  },
});

export const removePhoto = mutation({
  args: { token: v.optional(v.string()), storageId: v.id("_storage") },
  handler: async (ctx, { token, storageId }) => {
    const user = await requireUser(ctx, token);
    if (user.photos.includes(storageId)) {
      await ctx.db.patch(user._id, {
        photos: user.photos.filter((p) => p !== storageId),
      });
      await ctx.storage.delete(storageId);
    }
    return { ok: true };
  },
});
