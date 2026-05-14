"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const client_1 = require("@prisma/client");
const comment_repository_1 = require("../repositories/comment.repository");
const sanitize_1 = require("../utils/sanitize");
exports.commentService = {
    listAdmin(page, limit, filters) {
        const skip = (page - 1) * limit;
        return Promise.all([
            comment_repository_1.commentRepository.listAdmin({ skip, take: limit, ...filters }),
            comment_repository_1.commentRepository.countAdmin(filters)
        ]).then(([items, total]) => ({ items, total }));
    },
    countAdmin(filters) {
        return comment_repository_1.commentRepository.countAdmin(filters);
    },
    countApproved() {
        return comment_repository_1.commentRepository.countApproved();
    },
    create(input) {
        const payload = {
            postId: input.postId,
            name: (0, sanitize_1.sanitizePlainText)(input.name),
            content: (0, sanitize_1.sanitizePlainText)(input.content),
            ...(input.parentId && input.parentId.length > 0 ? { parentId: input.parentId } : {}),
            ...(input.email ? { email: (0, sanitize_1.sanitizePlainText)(input.email) } : {})
        };
        return comment_repository_1.commentRepository.create(payload);
    },
    approve(id) {
        return comment_repository_1.commentRepository.updateStatus(id, client_1.CommentStatus.APPROVED);
    },
    spam(id) {
        return comment_repository_1.commentRepository.updateStatus(id, client_1.CommentStatus.SPAM);
    },
    delete(id) {
        return comment_repository_1.commentRepository.delete(id);
    }
};
