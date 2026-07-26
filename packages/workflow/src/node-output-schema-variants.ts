/**
 * `__schema__` layout variants.
 *
 * A node's output items are not always a function of resource/operation alone:
 * OpenAI reshapes its items based on `simplify` and the configured output
 * format, and AI roots carry an output parser's fields when one is attached.
 * Variants live next to the base schema as `<operation>.<variant>.json` (or
 * `output.<variant>.json` for nodes without discriminators).
 *
 * This module is the single source of truth for which variant a node config
 * resolves to. It lives in `n8n-workflow` because both the filesystem resolver
 * (`n8n-core`) and the SDK's own schema discovery (`@n8n/workflow-sdk`) need it
 * and neither depends on the other.
 */

import { OPENAI_LANGCHAIN_NODE_TYPE } from './constants';

/** AI root with an `ai_outputParser` attached — items carry the parser's fields. */
export const OUTPUT_PARSER_SCHEMA_VARIANT = 'with-parser';

/**
 * Structured output (JSON object / JSON schema) — the node parses the model's
 * reply, so text fields hold objects rather than JSON-encoded strings.
 */
export const STRUCTURED_OUTPUT_SCHEMA_VARIANT = 'structured';

/** Simplify off — items are the provider's full API payload, unreshaped. */
export const RAW_OUTPUT_SCHEMA_VARIANT = 'raw';

export interface OutputSchemaVariantInput {
	type: string;
	parameters?: Record<string, unknown>;
	/** Node has an `ai_outputParser` attached. */
	hasOutputParser?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read a `fixedCollection` member. n8n stores single-value collections as an
 * object, but a declared array default can survive into saved parameters.
 */
function readCollectionMember(
	container: unknown,
	key: string,
): Record<string, unknown> | undefined {
	if (!isRecord(container)) return undefined;
	const member = container[key];
	if (isRecord(member)) return member;
	if (Array.isArray(member) && isRecord(member[0])) return member[0];
	return undefined;
}

/**
 * v2 puts the format under Options → Output Format
 * (`options.textFormat.textOptions.type`); v1 exposes a boolean (`jsonOutput`).
 */
function isOpenAiStructuredOutput(parameters: Record<string, unknown>): boolean {
	if (parameters.jsonOutput === true) return true;

	const textFormat = readCollectionMember(parameters.options, 'textFormat');
	const textOptions = readCollectionMember(textFormat, 'textOptions');
	const formatType = textOptions?.type;
	return formatType === 'json_object' || formatType === 'json_schema';
}

type VariantRule = (parameters: Record<string, unknown>) => string | undefined;

const PARAMETER_VARIANT_RULES: Record<string, VariantRule> = {
	[OPENAI_LANGCHAIN_NODE_TYPE]: (parameters) => {
		// Simplify is on by default, so only an explicit `false` means raw.
		if (parameters.simplify === false) return RAW_OUTPUT_SCHEMA_VARIANT;
		if (isOpenAiStructuredOutput(parameters)) return STRUCTURED_OUTPUT_SCHEMA_VARIANT;
		return undefined;
	},
};

/**
 * The `__schema__` variant a node config resolves to, or undefined for the base
 * layout. An attached output parser wins: it replaces the item shape entirely,
 * whatever the node's own formatting parameters say.
 */
export function resolveOutputSchemaVariant(node: OutputSchemaVariantInput): string | undefined {
	if (node.hasOutputParser) return OUTPUT_PARSER_SCHEMA_VARIANT;

	const rule = PARAMETER_VARIANT_RULES[node.type];
	return rule?.(node.parameters ?? {});
}
