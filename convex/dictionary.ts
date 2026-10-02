import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { guard } from "./lib";

export const search = query({
  args: { secret: v.string(), q: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);
    let words = (await ctx.db.query("dictionaryWords").collect()) as unknown as Array<
      Record<string, unknown> & { _id: string; arabic: string; english: string; description: string; createdAt: number }
    >;
    if (args.q && args.q.trim()) {
      const q = args.q.trim().toLowerCase();
      words = words.filter(
        (w) =>
          w.arabic.includes(args.q!.trim()) ||
          w.english.toLowerCase().includes(q) ||
          (w.description || "").includes(args.q!.trim())
      );
    }
    words.sort((a, b) => a.english.localeCompare(b.english));
    return words.map(stripDoc);
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    arabic: v.string(),
    english: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const id = await ctx.db.insert("dictionaryWords", {
      arabic: args.arabic,
      english: args.english,
      description: args.description ?? "",
      createdAt: Date.now(),
    });
    const w = (await ctx.db.get(id as never)) as unknown as Record<string, unknown> & { _id: string };
    return stripDoc(w);
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.string(),
    arabic: v.string(),
    english: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    guard(args);
    const existing = await ctx.db.get(args.id as never);
    if (!existing) throw new ConvexError("الكلمة غير موجودة");
    await ctx.db.patch(args.id as never, {
      arabic: args.arabic,
      english: args.english,
      description: args.description ?? "",
    });
    const w = (await ctx.db.get(args.id as never)) as unknown as Record<string, unknown> & { _id: string };
    return stripDoc(w);
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const existing = await ctx.db.get(args.id as never);
    if (!existing) throw new ConvexError("الكلمة غير موجودة");
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

export function stripDoc<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
