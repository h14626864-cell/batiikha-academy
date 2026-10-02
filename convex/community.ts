import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { guard, Ctx } from "./lib";

type PostDoc = { _id: string; title: string; content: string; userId: string; createdAt: number };
type CommentDoc = { _id: string; postId: string; userId: string; content: string; createdAt: number };

async function userBrief(ctx: Ctx, userId: string) {
  const u = (await ctx.db.get(userId as never)) as unknown as { _id: string; name?: string | null; image?: string | null; role: string; banned?: boolean } | null;
  return u ? { id: u._id, name: u.name, image: u.image, role: u.role } : null;
}

/** Community lock state (admin can close the chat for everyone). */
export const getSettings = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    const doc = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "community"))
      .first()) as unknown as { locked?: boolean } | null;
    return { locked: doc?.locked ?? false };
  },
});

export const setLocked = mutation({
  args: { secret: v.string(), locked: v.boolean() },
  handler: async (ctx, args) => {
    guard(args);
    const doc = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "community"))
      .first()) as unknown as { _id: string } | null;
    if (doc) await ctx.db.patch(doc._id as never, { locked: args.locked });
    else await ctx.db.insert("appSettings", { key: "community", locked: args.locked });
    return { ok: true };
  },
});

async function isLocked(ctx: Ctx): Promise<boolean> {
  const doc = (await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "community"))
    .first()) as unknown as { locked?: boolean } | null;
  return doc?.locked ?? false;
}

async function userRole(ctx: Ctx, userId: string): Promise<string> {
  const u = (await ctx.db.get(userId as never)) as unknown as { role: string } | null;
  return u?.role ?? "STUDENT";
}

export const listPosts = query({
  args: { secret: v.string(), postId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    guard(args);

    if (args.postId) {
      const post = (await ctx.db.get(args.postId as never)) as unknown as PostDoc | null;
      if (!post) throw new ConvexError("المنشور غير موجود");
      return [await postFull(ctx, post)];
    }

    const posts = (await ctx.db.query("posts").collect()) as unknown as PostDoc[];
    posts.sort((a, b) => b.createdAt - a.createdAt);
    const out: unknown[] = [];
    for (const p of posts.slice(0, 100)) out.push(await postFull(ctx, p));
    return out;
  },
});

async function postFull(ctx: Ctx, post: PostDoc) {
  const comments = (await ctx.db
    .query("comments")
    .withIndex("by_post", (q) => q.eq("postId", post._id as never))
    .collect()) as unknown as CommentDoc[];
  comments.sort((a, b) => a.createdAt - b.createdAt);
  const commentsOut: unknown[] = [];
  for (const c of comments) commentsOut.push({ ...strip(c), user: await userBrief(ctx, c.userId) });
  return {
    ...strip(post),
    user: await userBrief(ctx, post.userId),
    comments: commentsOut,
    _count: { comments: commentsOut.length },
  };
}

export const createPost = mutation({
  args: { secret: v.string(), userId: v.string(), title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    // locked chat: only admins can still post (announcements)
    if ((await isLocked(ctx)) && (await userRole(ctx, args.userId)) !== "ADMIN") {
      throw new ConvexError("المجتمع مقفول حاليًا من الإدارة");
    }
    const id = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      userId: args.userId as never,
      createdAt: Date.now(),
    });
    const post = (await ctx.db.get(id as never)) as unknown as PostDoc;
    return { ...strip(post), user: await userBrief(ctx, post.userId), comments: [], _count: { comments: 0 } };
  },
});

export const deletePost = mutation({
  args: { secret: v.string(), id: v.string(), requesterId: v.string(), requesterIsAdmin: v.boolean() },
  handler: async (ctx, args) => {
    guard(args);
    const post = (await ctx.db.get(args.id as never)) as unknown as PostDoc | null;
    if (!post) throw new ConvexError("غير موجود");
    if (post.userId !== args.requesterId && !args.requesterIsAdmin) throw new ConvexError("غير مسموح");
    for (const c of (await ctx.db.query("comments").withIndex("by_post", (q) => q.eq("postId", post._id as never)).collect()) as unknown as Array<{ _id: string }>)
      await ctx.db.delete(c._id as never);
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

export const createComment = mutation({
  args: { secret: v.string(), userId: v.string(), postId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    guard(args);
    // locked chat: only admins can still reply
    if ((await isLocked(ctx)) && (await userRole(ctx, args.userId)) !== "ADMIN") {
      throw new ConvexError("المجتمع مقفول حاليًا من الإدارة");
    }
    const id = await ctx.db.insert("comments", {
      postId: args.postId as never,
      userId: args.userId as never,
      content: args.content,
      createdAt: Date.now(),
    });
    const c = (await ctx.db.get(id as never)) as unknown as CommentDoc;
    return { ...strip(c), user: await userBrief(ctx, c.userId) };
  },
});

export const deleteComment = mutation({
  args: { secret: v.string(), id: v.string(), requesterId: v.string(), requesterIsAdmin: v.boolean() },
  handler: async (ctx, args) => {
    guard(args);
    const c = (await ctx.db.get(args.id as never)) as unknown as CommentDoc | null;
    if (!c) throw new ConvexError("غير موجود");
    if (c.userId !== args.requesterId && !args.requesterIsAdmin) throw new ConvexError("غير مسموح");
    await ctx.db.delete(args.id as never);
    return { ok: true };
  },
});

function strip<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc;
  return { id: _id, ...rest };
}
