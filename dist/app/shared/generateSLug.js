"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = void 0;
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .normalize("NFKC") // Normalize without breaking Bangla characters
        .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "") // Allow letters, numbers, combining marks, spaces, and dashes
        .replace(/\s+/g, "-") // Replace spaces with dashes
        .replace(/--+/g, "-") // Replace multiple dashes with a single dash
        .trim(); // Trim leading and trailing spaces or dashes
};
exports.generateSlug = generateSlug;
