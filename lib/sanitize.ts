import createDOMPurify from "isomorphic-dompurify";

export function sanitizeMessageHtml(dirty: string): string {
  return createDOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "strong", "em", "br", "p", "div", "span"],
    ALLOWED_ATTR: [],
  });
}
