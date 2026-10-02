import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { guard } from "./lib";

/** Generate a direct-upload URL (server posts the file bytes to it). */
export const generateUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveMetadata = mutation({
  args: {
    secret: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    guard(args);
    const id = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      contentType: args.contentType,
      size: args.size,
      uploadedAt: Date.now(),
    });
    return id;
  },
});

/** Resolve a stable serving URL for an uploaded file. */
export const getUrl = query({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const doc = (await ctx.db.get(args.id as never)) as unknown as { storageId: string } | null;
    if (!doc) return null;
    return await ctx.storage.getUrl(doc.storageId as never);
  },
});
