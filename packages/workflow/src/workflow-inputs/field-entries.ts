import { json as generateSchemaFromExample, type SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';

import {
	INPUT_SOURCE,
	JSON_EXAMPLE,
	PASSTHROUGH,
	TYPE_OPTIONS,
	VALUES,
	WORKFLOW_INPUTS,
} from './constants';
import { NodeOperationError } from '../errors/node-operation.error';
import type {
	FieldType,
	FieldValueOption,
	IWorkflowNodeContext,
	WorkflowInputsData,
} from '../interfaces';
import { jsonParse } from '../utils';

const SUPPORTED_TYPES = TYPE_OPTIONS.map((x) => x.value);

function parseJsonSchema(schema: JSONSchema7): FieldValueOption[] | string {
	if (schema.type !== 'object') {
		if (schema.type === undefined) {
			return 'Invalid JSON schema. Missing key `type` in schema';
		}

		if (Array.isArray(schema.type)) {
			return `Invalid JSON schema type. Only object type is supported, but got an array of types: ${schema.type.join(', ')}`;
		}

		return `Invalid JSON schema type. Only object type is supported, but got ${schema.type}`;
	}

	if (!schema?.properties) {
		return 'Invalid JSON schema. Missing key `properties` in schema';
	}

	if (typeof schema.properties !== 'object') {
		return 'Invalid JSON schema. Key `properties` is not an object';
	}

	const result: FieldValueOption[] = [];
	for (const [name, v] of Object.entries(schema.properties)) {
		if (typeof v !== 'object') {
			return `Invalid JSON schema. Value for property '${name}' is not an object`;
		}

		const type = v?.type;

		if (type === 'null') {
			result.push({ name, type: 'any' });
		} else if (Array.isArray(type)) {
			// Schema allows an array of types, but we don't
			return `Invalid JSON schema. Array of types for property '${name}' is not supported by n8n. Either provide a single type or use type 'any' to allow any type`;
		} else if (typeof type !== 'string') {
			return `Invalid JSON schema. Unexpected non-string type ${type} for property '${name}'`;
		} else if (!SUPPORTED_TYPES.includes(type as never)) {
			return `Invalid JSON schema. Unsupported type ${type} for property '${name}'. Supported types are ${JSON.stringify(SUPPORTED_TYPES, null, 1)}`;
		} else {
			result.push({ name, type: type as FieldType });
		}
	}
	return result;
}

function parseJsonExample(context: IWorkflowNodeContext): JSONSchema7 {
	const jsonString = context.getNodeParameter(JSON_EXAMPLE, 0, '') as string;
	const json = jsonParse<SchemaObject>(jsonString);

	return generateSchemaFromExample(json) as JSONSchema7;
}

/**
 * Reads the input contract a workflow declares on its Execute Workflow Trigger:
 * the named, typed fields a caller is expected to supply.
 *
 * Lives here rather than beside the node because the contract has several
 * readers — the parent editor's resource mapper, MCP deriving tool arguments,
 * and the run surfaces that render a form from it — and they must all see the
 * same fields.
 *
 * @throws {NodeOperationError} When the declared schema is not usable.
 */
export function getFieldEntries(context: IWorkflowNodeContext): {
	dataMode: WorkflowInputsData['dataMode'];
	fields: FieldValueOption[];
	subworkflowInfo?: WorkflowInputsData['subworkflowInfo'];
} {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH);
	let result: FieldValueOption[] | string = 'Internal Error: Invalid input source';
	try {
		if (inputSource === WORKFLOW_INPUTS) {
			result = context.getNodeParameter(
				`${WORKFLOW_INPUTS}.${VALUES}`,
				0,
				[],
			) as FieldValueOption[];
		} else if (inputSource === JSON_EXAMPLE) {
			const schema = parseJsonExample(context);
			result = parseJsonSchema(schema);
		} else if (inputSource === PASSTHROUGH) {
			result = [];
		}
	} catch (e: unknown) {
		result =
			e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
				? e.message
				: `Unknown error occurred: ${JSON.stringify(e)}`;
	}

	if (Array.isArray(result)) {
		const dataMode = String(inputSource);
		const workflow = context.getWorkflow();
		const node = context.getNode();
		return {
			fields: result,
			dataMode,
			subworkflowInfo: { workflowId: workflow.id, triggerId: node.id },
		};
	}
	throw new NodeOperationError(context.getNode(), result);
}
