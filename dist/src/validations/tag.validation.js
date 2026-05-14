"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagSchema = void 0;
const zod_1 = require("zod");
exports.tagSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120)
});
