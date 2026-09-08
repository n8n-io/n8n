/**
 * Encode an id as a single URL path segment. `.`, `..`, and the empty string
 * are rejected: they survive encodeURIComponent but are removed during path
 * normalisation, so they cannot be encoded safely. Nullish values are
 * rejected before encoding, since they would otherwise become the literal
 * string "null" or "undefined".
 */
export declare function toPathSegment(id: unknown): string;
//# sourceMappingURL=url.d.ts.map