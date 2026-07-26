import { OPENAI_LANGCHAIN_NODE_TYPE } from '../src/constants';
import {
	OUTPUT_PARSER_SCHEMA_VARIANT,
	RAW_OUTPUT_SCHEMA_VARIANT,
	resolveOutputSchemaVariant,
	STRUCTURED_OUTPUT_SCHEMA_VARIANT,
} from '../src/node-output-schema-variants';

describe('resolveOutputSchemaVariant', () => {
	it('returns undefined for node types without variant rules', () => {
		expect(
			resolveOutputSchemaVariant({
				type: 'n8n-nodes-base.gmail',
				parameters: { resource: 'message', operation: 'getAll', simplify: false },
			}),
		).toBeUndefined();
	});

	it('prefers the output-parser variant over parameter-derived ones', () => {
		expect(
			resolveOutputSchemaVariant({
				type: OPENAI_LANGCHAIN_NODE_TYPE,
				parameters: { simplify: false },
				hasOutputParser: true,
			}),
		).toBe(OUTPUT_PARSER_SCHEMA_VARIANT);
	});

	describe('OpenAI', () => {
		const resolve = (parameters: Record<string, unknown>) =>
			resolveOutputSchemaVariant({ type: OPENAI_LANGCHAIN_NODE_TYPE, parameters });

		it('resolves the base layout for a plain simplified reply', () => {
			expect(resolve({ resource: 'text', operation: 'response' })).toBeUndefined();
			expect(resolve({ simplify: true })).toBeUndefined();
			// Missing parameters entirely — simplify defaults to on.
			expect(resolveOutputSchemaVariant({ type: OPENAI_LANGCHAIN_NODE_TYPE })).toBeUndefined();
		});

		it('resolves raw only when simplify is explicitly off', () => {
			expect(resolve({ simplify: false })).toBe(RAW_OUTPUT_SCHEMA_VARIANT);
			expect(resolve({ simplify: 'false' })).toBeUndefined();
		});

		it('resolves structured for v2 JSON output formats', () => {
			for (const type of ['json_object', 'json_schema']) {
				expect(resolve({ options: { textFormat: { textOptions: { type } } } })).toBe(
					STRUCTURED_OUTPUT_SCHEMA_VARIANT,
				);
			}
			expect(
				resolve({ options: { textFormat: { textOptions: { type: 'text' } } } }),
			).toBeUndefined();
		});

		it('reads an array-shaped fixedCollection member', () => {
			expect(resolve({ options: { textFormat: { textOptions: [{ type: 'json_schema' }] } } })).toBe(
				STRUCTURED_OUTPUT_SCHEMA_VARIANT,
			);
		});

		it('resolves structured for the v1 jsonOutput boolean', () => {
			expect(resolve({ jsonOutput: true })).toBe(STRUCTURED_OUTPUT_SCHEMA_VARIANT);
			expect(resolve({ jsonOutput: false })).toBeUndefined();
		});

		it('lets simplify off win over a structured format', () => {
			// The raw payload nests the parsed text deeper, so its own schema applies.
			expect(
				resolve({
					simplify: false,
					options: { textFormat: { textOptions: { type: 'json_object' } } },
				}),
			).toBe(RAW_OUTPUT_SCHEMA_VARIANT);
		});

		it('ignores malformed option containers', () => {
			expect(resolve({ options: 'nope' })).toBeUndefined();
			expect(resolve({ options: { textFormat: 42 } })).toBeUndefined();
			expect(resolve({ options: { textFormat: { textOptions: [] } } })).toBeUndefined();
		});
	});
});
