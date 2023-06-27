import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Comment ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		typeOptions: {
			rows: 2,
		},
	},
];

const displayOptions = {
	show: {
		resource: ['comment'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const id = this.getNodeParameter('id', i) as string;
	const message = this.getNodeParameter('message', i) as string;

	const body: IDataObject = {
		message,
	};

	responseData = await theHiveApiRequest.call(this, 'PATCH', `/v1/comment/${id}`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
