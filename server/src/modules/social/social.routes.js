import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { saveUserImage } from "../../lib/uploads.js";

const router = Router();
router.use(requireAuth);

const postSchema = z.object({
  content: z.string().min(1),
  imageBase64: z.string().optional(),
  visibility: z.string().default("public"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.take) || 10, 50);
    const cursor = req.query.cursor;

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: req.user.id }, select: { id: true } },
      },
    });

    const hasMore = posts.length > take;
    const page = hasMore ? posts.slice(0, take) : posts;

    res.json({
      posts: page.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.mediaUrl,
        createdAt: p.createdAt,
        author: p.user,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        likedByMe: p.likes.length > 0,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  })
);

router.post(
  "/",
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const { imageBase64, content, visibility } = req.body;
    const data = { content, visibility, userId: req.user.id };
    if (imageBase64) {
      data.mediaUrl = await saveUserImage(req.user.id, imageBase64);
    }
    const post = await prisma.post.create({ data });
    res.status(201).json({ post });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found");
    if (post.userId !== req.user.id) throw new HttpError(403, "You can only delete your own posts");
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.post(
  "/:id/like",
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: req.user.id } },
    });
    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }
    await prisma.postLike.create({ data: { postId, userId: req.user.id } });
    res.json({ liked: true });
  })
);

const commentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
});

router.post(
  "/:id/comments",
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found");

    if (req.body.parentId) {
      const parent = await prisma.postComment.findUnique({ where: { id: req.body.parentId } });
      if (!parent || parent.postId !== req.params.id) throw new HttpError(404, "Parent comment not found");
    }

    const created = await prisma.postComment.create({
      data: {
        postId: req.params.id,
        userId: req.user.id,
        content: req.body.content,
        parentId: req.body.parentId || null,
      },
      include: { user: { select: { id: true, name: true, username: true } } },
    });

    res.status(201).json({
      comment: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt,
        parentId: created.parentId,
        author: created.user,
        replies: [],
      },
    });
  })
);

router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, username: true } } },
    });

    const byId = new Map();
    const roots = [];
    for (const c of comments) {
      byId.set(c.id, {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        parentId: c.parentId,
        author: c.user,
        replies: [],
      });
    }
    for (const c of comments) {
      const node = byId.get(c.id);
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ comments: roots });
  })
);

export default router;
