import pickBy from 'lodash/pickBy';
import type {
	INodeExecutionData,
	IDataObject,
	ResourceMapperField,
	ILocalLoadOptionsFunctions,
	WorkflowInputsData,
	IExecuteFunctions,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { getFieldEntries, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { PASSTHROUGH } from './constants';

export { getFieldEntries };

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
	// Use the draft subworkflow so the parent editor reflects unsaved/unpublished
	// trigger input changes (manual runs already resolve against draft).
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
