import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Folders Name or ID',
		name: 'folderId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getFoldersWithFilepath',
		},
		default: [],
		description:
			'The folder to get the messages from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
	const messageId = this.getNodeParameter('messageId', index) as string;
	const destinationId = this.getNodeParameter('folderId', index) as string;
	const body: IDataObject = {
		destinationId,
	};

	await microsoftApiRequest.call(this, 'POST', `/messages/${messageId}/move`, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
