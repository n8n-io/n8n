import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Folder ID',
		name: 'folderId',
		description: 'Target Folder ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['move'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;

	const messageId = this.getNodeParameter('messageId', index) as string;
	const destinationId = this.getNodeParameter('folderId', index) as string;
	const body: IDataObject = {
		destinationId,
	};

	responseData = await microsoftApiRequest.call(this, 'POST', `/messages/${messageId}/move`, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
