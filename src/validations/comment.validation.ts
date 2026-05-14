import { z } from "zod";

export const commentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().optional().or(z.literal("")),
  content: z.string().trim().min(3).max(4000)
});
