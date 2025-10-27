import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { caseRLC } from '../../descriptions';
import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	caseRLC,
	{
		displayName: 'Fields',
		name: 'taskFields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getTaskFields',
				mode: 'add',
				valuesLabel: 'Fields',
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];
	let body: IDataObject = {};

	const dataMode = this.getNodeParameter('taskFields.mappingMode', i) as string;
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	if (dataMode === 'autoMapInputData') {
		const schema = this.getNodeParameter('taskFields.schema', i) as IDataObject[];
		body = prepareInputItem(item.json, schema, i);
	}

	if (dataMode === 'defineBelow') {
		const taskFields = this.getNodeParameter('taskFields.value', i, []) as IDataObject;
		body = taskFields;
	}

	body = fixFieldType(body);

	responseData = await theHiveApiRequest.call(this, 'POST', `/v1/case/${caseId}/task`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
