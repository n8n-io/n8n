import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { messageRLC } from '../../descriptions';
import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../../../../Google/Drive/v2/actions/common.descriptions';

export const properties: INodeProperties[] = [
	messageRLC,
	{ ...folderRLC, displayName: 'Parent Folder' },
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

	const destinationId = this.getNodeParameter('folderId', index, undefined, {
		extractValue: true,
	}) as string;

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
