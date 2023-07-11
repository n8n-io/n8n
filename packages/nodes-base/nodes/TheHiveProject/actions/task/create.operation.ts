import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { theHiveApiRequest } from '../../transport';

import { fixFieldType } from '../../helpers/utils';
import { caseRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	caseRLC,
	{
		displayName: 'Fields',
		name: 'fields',
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

	const dataMode = this.getNodeParameter('fields.mappingMode', i) as string;
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	if (dataMode === 'autoMapInputData') {
		body = item.json;
	}

	if (dataMode === 'defineBelow') {
		const fields = this.getNodeParameter('fields.value', i, []) as IDataObject;
		body = fields;
	}

	body = fixFieldType(body);

	responseData = await theHiveApiRequest.call(this, 'POST', `/v1/case/${caseId}/task`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
