import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { messageRLC } from '../../descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	messageRLC,
	{
		displayName: 'Folder Name or ID',
		name: 'folderId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getFoldersWithFilepath',
		},
		default: [],
		description:
			'The folder to move the message to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['move'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;
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
