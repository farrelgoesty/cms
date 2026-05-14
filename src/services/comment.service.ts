import { CommentStatus } from "@prisma/client";
import { commentRepository } from "../repositories/comment.repository";
import { sanitizePlainText } from "../utils/sanitize";

export const commentService = {
  listAdmin(page: number, limit: number, filters?: { q?: string; status?: CommentStatus | "ALL" }) {
    const skip = (page - 1) * limit;
    return Promise.all([
      commentRepository.listAdmin({ skip, take: limit, ...filters }),
      commentRepository.countAdmin(filters)
    ]).then(([items, total]) => ({ items, total }));
  },

  countAdmin(filters?: { q?: string; status?: CommentStatus | "ALL" }) {
    return commentRepository.countAdmin(filters);
  },

  countApproved() {
    return commentRepository.countApproved();
  },

  create(input: { postId: string; parentId?: string; name: string; email?: string | null; content: string }) {
    const payload = {
      postId: input.postId,
      name: sanitizePlainText(input.name),
      content: sanitizePlainText(input.content),
      ...(input.parentId && input.parentId.length > 0 ? { parentId: input.parentId } : {}),
      ...(input.email ? { email: sanitizePlainText(input.email) } : {})
    };

    return commentRepository.create(payload);
  },

  approve(id: string) {
    return commentRepository.updateStatus(id, CommentStatus.APPROVED);
  },

  spam(id: string) {
    return commentRepository.updateStatus(id, CommentStatus.SPAM);
  },

  delete(id: string) {
    return commentRepository.delete(id);
  }
};
