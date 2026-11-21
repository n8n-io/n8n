/**
 * `ot` and `gateway` share a host and an authentication order; they are kept
 * apart so error messages and metadata can name the right product.
 */
export type QualysPlane = 'ot' | 'gateway' | 'csam' | 'fo';

/**
 * Resources group endpoints by what the data is. The operation names the
 * specific record, so `Vulnerability > List Detections` reads as a sentence
 * instead of needing one resource per endpoint.
 */
export type QualysResource = 'ot' | 'itAsset' | 'vmdr' | 'easm';

/** What the router does with a response, independent of which record it is. */
export type QualysOperationKind = 'list' | 'get' | 'count';

export type QualysOutputMode = 'items' | 'raw';

export type QualysItemGranularity = 'detection' | 'host';
