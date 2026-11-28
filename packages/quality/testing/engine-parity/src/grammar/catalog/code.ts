import fc from 'fast-check';

import { valueExprArb } from '../expressions';
import type { CatalogEntry, CodeSpec } from './types';

/**
 * The generator writes the `jsCode` string itself. The SDK helper
 * `runOnceForAllItems` parses `fn.toString()`, which does not fit generated code.
 */
function codeEntry(id: string, mode: CodeSpec['mode']): CatalogEntry {
	return {
		id,
		type: 'n8n-nodes-base.code',
		version: 2,
		role: 'plain',
		inputs: 1,
		outputs: 1,
		deterministic: true,
		params: ({ rules }) =>
			fc
				.record({
					field: fc.constantFrom('c', 'n', 's'),
					value: valueExprArb(rules),
					spread: fc.boolean(),
				})
				.map((spec) => ({
					mode,
					language: 'javaScript',
					jsCode: { $code: { ...spec, mode } satisfies CodeSpec },
				})),
	};
}

export const codeAllItems = codeEntry('code.allItems', 'runOnceForAllItems');
export const codeEachItem = codeEntry('code.eachItem', 'runOnceForEachItem');
