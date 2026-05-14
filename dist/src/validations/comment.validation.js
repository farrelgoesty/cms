"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentSchema = void 0;
const zod_1 = require("zod");
exports.commentSchema = zod_1.z.object({
    postId: zod_1.z.string().uuid(),
    parentId: zod_1.z.string().uuid().optional().or(zod_1.z.literal("")),
    name: zod_1.z.string().trim().min(2).max(100),
    email: zod_1.z.string().trim().email().optional().or(zod_1.z.literal("")),
    content: zod_1.z.string().trim().min(3).max(4000)
});
