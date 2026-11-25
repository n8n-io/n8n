import fc from 'fast-check';

import { valueExprArb } from '../expressions';
import type { CatalogEntry } from './types';

const TYPE = 'n8n-nodes-base.set';
const VERSION = 3.4;

/** The fields that Set nodes write. Some of them overwrite trigger fields. */
const TARGET_FIELDS = ['n', 's', 'id', 'r', 't'];

export const setManual: CatalogEntry = {
	id: 'set.manual',
	type: TYPE,
	version: VERSION,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: ({ rules }) =>
		fc
			.record({
				assignments: fc.array(
					fc.record({
						name: fc.constantFrom(...TARGET_FIELDS),
						type: fc.constantFrom('string', 'number', 'boolean'),
						value: fc.oneof(
							{ arbitrary: valueExprArb(rules).map(($expr) => ({ $expr })), weight: 4 },
							{ arbitrary: fc.oneof(fc.integer({ min: 0, max: 5 }), fc.constant('v')), weight: 1 },
						),
					}),
					{ minLength: 1, maxLength: 3 },
				),
				includeOtherFields: fc.boolean(),
				ignoreConversionErrors: fc.boolean(),
			})
			.map(({ assignments, includeOtherFields, ignoreConversionErrors }) => ({
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: assignments.map((assignment, i) => ({ id: `a${i}`, ...assignment })),
				},
				includeOtherFields,
				options: { ignoreConversionErrors },
			})),
};

export const setRaw: CatalogEntry = {
	id: 'set.raw',
	type: TYPE,
	version: VERSION,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: ({ rules }) =>
		fc
			.record({
				fields: fc.dictionary(
					fc.constantFrom(...TARGET_FIELDS),
					fc.oneof(
						{ arbitrary: valueExprArb(rules).map(($expr) => ({ $expr })), weight: 2 },
						{
							arbitrary: fc.oneof(fc.integer({ min: 0, max: 5 }), fc.constant('v'), fc.boolean()),
							weight: 1,
						},
					),
					{ minKeys: 1, maxKeys: 3 },
				),
				includeOtherFields: fc.boolean(),
			})
			.map(({ fields, includeOtherFields }) => ({
				mode: 'raw',
				jsonOutput: { $jsonTemplate: fields },
				includeOtherFields,
				options: {},
			})),
};
