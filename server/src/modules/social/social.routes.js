import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const postSchema = z.object({
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  visibility: z.string().default("public"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, username: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: req.user.id }, select: { id: true } },
      },
    });
    res.json({
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        mediaUrl: p.mediaUrl,
        createdAt: p.createdAt,
        author: p.user,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        likedByMe: p.likes.length > 0,
      })),
    });
  })
);

router.post(
  "/",
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.create({ data: { ...req.body, userId: req.user.id } });
    res.status(201).json({ post });
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

const commentSchema = z.object({ content: z.string().min(1) });

router.post(
  "/:id/comments",
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new HttpError(404, "Post not found");
    const comment = await prisma.postComment.create({
      data: { postId: req.params.id, userId: req.user.id, content: req.body.content },
    });
    res.status(201).json({ comment });
  })
);

router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, username: true } } },
    });
    res.json({ comments });
  })
);

export default router;
