import { json as generateSchemaFromExample, type SchemaObject } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';
import pickBy from 'lodash/pickBy';
import type {
	FieldValueOption,
	FieldType,
	IWorkflowNodeContext,
	INodeExecutionData,
	IDataObject,
	ResourceMapperField,
	ILocalLoadOptionsFunctions,
	WorkflowInputsData,
	IExecuteFunctions,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import {
	JSON_EXAMPLE,
	INPUT_SOURCE,
	WORKFLOW_INPUTS,
	VALUES,
	TYPE_OPTIONS,
	PASSTHROUGH,
} from './constants';

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

export function getWorkflowInputValues(
	this: IExecuteFunctions | ISupplyDataFunctions,
): INodeExecutionData[] {
	const inputData = this.getInputData();

	return inputData.map(({ json, binary }, itemIndex) => {
		const itemFieldValues = this.getNodeParameter(
			'workflowInputs.value',
			itemIndex,
			{},
		) as IDataObject;

		return {
			json: {
				...json,
				...itemFieldValues,
			},
			index: itemIndex,
			pairedItem: {
				item: itemIndex,
			},
			binary,
		};
	});
}

export function getCurrentWorkflowInputData(this: IExecuteFunctions | ISupplyDataFunctions) {
	const inputData: INodeExecutionData[] = getWorkflowInputValues.call(this);

	const schema = this.getNodeParameter('workflowInputs.schema', 0, []) as ResourceMapperField[];

	if (schema.length === 0) {
		return inputData;
	} else {
		const removedKeys = new Set(schema.filter((x) => x.removed).map((x) => x.displayName));

		const filteredInputData: INodeExecutionData[] = inputData.map(({ json, binary }, index) => ({
			index,
			pairedItem: { item: index },
			json: pickBy(json, (_v, key) => !removedKeys.has(key)),
			binary,
		}));

		return filteredInputData;
	}
}

export async function loadWorkflowInputMappings(
	this: ILocalLoadOptionsFunctions,
): Promise<WorkflowInputsData> {
	const nodeLoadContext = await this.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	let fields: ResourceMapperField[] = [];
	let dataMode: string = PASSTHROUGH;
	let subworkflowInfo: { workflowId?: string; triggerId?: string } | undefined;

	if (nodeLoadContext) {
		const fieldValues = getFieldEntries(nodeLoadContext);
		dataMode = fieldValues.dataMode;
		subworkflowInfo = fieldValues.subworkflowInfo;

		fields = fieldValues.fields.map((currentWorkflowInput) => {
			const field: ResourceMapperField = {
				id: currentWorkflowInput.name,
				displayName: currentWorkflowInput.name,
				required: false,
				defaultMatch: false,
				display: true,
				canBeUsedToMatch: true,
			};

			if (currentWorkflowInput.type !== 'any') {
				field.type = currentWorkflowInput.type;
			}

			return field;
		});
	}
	return { fields, dataMode, subworkflowInfo };
}
