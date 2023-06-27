import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Alert ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the alert',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		placeholder: 'Add Field',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: 'Case template to use when a case is created from this alert',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['promote'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('id', i) as string;

	const additionalFields = this.getNodeParameter('additionalFields', i);

	const body: IDataObject = {};

	Object.assign(body, additionalFields);

	responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/createCase`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
