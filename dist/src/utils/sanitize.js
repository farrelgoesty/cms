"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRichText = sanitizeRichText;
exports.sanitizePlainText = sanitizePlainText;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
function isExternalHref(href) {
    return /^https?:\/\//i.test(href);
}
function sanitizeRichText(value) {
    return (0, sanitize_html_1.default)(value, {
        allowedTags: [
            "a",
            "blockquote",
            "br",
            "code",
            "div",
            "em",
            "figcaption",
            "figure",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "hr",
            "img",
            "li",
            "ol",
            "p",
            "pre",
            "span",
            "strong",
            "table",
            "tbody",
            "td",
            "th",
            "thead",
            "tr",
            "ul"
        ],
        allowedAttributes: {
            a: ["href", "name", "target", "rel", "class"],
            img: ["src", "alt", "title", "width", "height", "loading", "decoding", "srcset", "sizes"],
            table: ["class"],
            td: ["colspan", "rowspan", "scope"],
            th: ["colspan", "rowspan", "scope"],
            "*": ["class"]
        },
        transformTags: {
            a: (tagName, attribs) => {
                const href = attribs.href ?? "";
                const classes = new Set((attribs.class ?? "").split(/\s+/).filter(Boolean));
                classes.add("article-link");
                if (isExternalHref(href)) {
                    classes.add("article-link-external");
                    return {
                        tagName,
                        attribs: {
                            ...attribs,
                            class: Array.from(classes).join(" "),
                            target: "_blank",
                            rel: "noopener noreferrer external"
                        }
                    };
                }
                classes.add("article-link-internal");
                return {
                    tagName,
                    attribs: {
                        ...attribs,
                        class: Array.from(classes).join(" "),
                        ...(attribs.rel ? { rel: attribs.rel } : {})
                    }
                };
            },
            img: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    loading: attribs.loading ?? "lazy",
                    decoding: "async"
                }
            })
        },
        allowedSchemes: ["http", "https", "mailto", "tel"],
        allowedSchemesByTag: {
            img: ["http", "https", "data"]
        }
    });
}
function sanitizePlainText(value) {
    return (0, sanitize_html_1.default)(value, { allowedTags: [], allowedAttributes: {} });
}
