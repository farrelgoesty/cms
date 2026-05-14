"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordSchema = exports.profileSchema = void 0;
const zod_1 = require("zod");
exports.profileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    avatar: zod_1.z.string().optional().or(zod_1.z.literal("")),
    bio: zod_1.z.string().optional().or(zod_1.z.literal(""))
});
exports.passwordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(72),
    confirmPassword: zod_1.z.string().min(8).max(72)
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama."
});
