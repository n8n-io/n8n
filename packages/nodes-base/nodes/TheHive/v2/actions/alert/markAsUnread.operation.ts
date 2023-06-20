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
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['markAsUnread'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('id', i) as string;

	responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/markAsUnread`);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
