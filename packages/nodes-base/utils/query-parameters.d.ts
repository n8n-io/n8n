import type { INode } from 'n8n-workflow';
type QueryParameterScalar = string | number | boolean | bigint | Date | null;
export declare function isScalarValue(value: unknown): value is QueryParameterScalar;
/**
 * Parses a JSON query and substitutes `$1`, `$2`, ... placeholders with the given parameters.
 *
 * Placeholders are only substituted when they make up a complete string value or a complete
 * object key, so a parameter can never contribute structure (extra keys, operators, extra
 * clauses) to the resulting query. A parameter bound to a key must be a plain, non-`$` string, so
 * it can neither turn into an operator nor shadow a reserved object property such as `constructor`,
 * and it must not collide with another field name in the same object, so it cannot replace a clause
 * the author wrote.
 */
export declare function parseAndResolveQueryParameters(query: string, rawParameters: unknown, node: INode, itemIndex: number, label?: string): unknown;
export {};
//# sourceMappingURL=query-parameters.d.ts.map