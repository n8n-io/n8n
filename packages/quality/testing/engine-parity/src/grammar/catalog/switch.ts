import fc from 'fast-check';

import { valueExprArb } from '../expressions';
import { conditionsArb } from './conditions';
import type { CatalogEntry } from './types';

const TYPE = 'n8n-nodes-base.switch';
const VERSION = 3.2;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const switchRules: CatalogEntry = {
	id: 'switch.rules',
	type: TYPE,
	version: VERSION,
	role: 'switch',
	inputs: 1,
	outputs: (params) => {
		const rules =
			isRecord(params.rules) && Array.isArray(params.rules.values) ? params.rules : undefined;
		const count = rules && Array.isArray(rules.values) ? rules.values.length : 0;
		const extra = isRecord(params.options) && params.options.fallbackOutput === 'extra' ? 1 : 0;
		return count + extra;
	},
	deterministic: true,
	params: (ctx) =>
		fc
			.record({
				values: fc.array(conditionsArb(ctx, false, true), { minLength: 1, maxLength: 3 }),
				fallbackOutput: fc.constantFrom('none', 'extra'),
				allMatchingOutputs: fc.boolean(),
			})
			.map(({ values, fallbackOutput, allMatchingOutputs }) => ({
				mode: 'rules',
				rules: {
					values: values.map(({ conditions }) => ({ conditions, renameOutput: false })),
				},
				looseTypeValidation: true,
				options: { fallbackOutput, allMatchingOutputs },
			})),
};

export const switchExpression: CatalogEntry = {
	id: 'switch.expression',
	type: TYPE,
	version: VERSION,
	role: 'switch',
	inputs: 1,
	outputs: (params) => (typeof params.numberOutputs === 'number' ? params.numberOutputs : 4),
	deterministic: true,
	params: ({ rules }) =>
		fc
			.record({ numberOutputs: fc.integer({ min: 2, max: 3 }), value: valueExprArb(rules) })
			.map(({ numberOutputs, value }) => ({
				mode: 'expression',
				numberOutputs,
				// An index that is out of range fails the node, on both engines.
				output: { $outputIndex: { value, numberOutputs } },
			})),
};
