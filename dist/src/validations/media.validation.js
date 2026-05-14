"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaSchema = void 0;
const zod_1 = require("zod");
exports.mediaSchema = zod_1.z.object({
    altText: zod_1.z.string().optional().or(zod_1.z.literal(""))
});
