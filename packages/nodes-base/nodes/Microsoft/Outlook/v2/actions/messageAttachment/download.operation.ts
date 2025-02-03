import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { attachmentRLC, messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	messageRLC,
	attachmentRLC,
	{
		displayName: 'Put Output in Field',
		name: 'binaryPropertyName',
		hint: 'The name of the output field to put the binary file data in',
		type: 'string',
		required: true,
		default: 'data',
	},
];

const displayOptions = {
	show: {
		resource: ['messageAttachment'],
		operation: ['download'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number, items: INodeExecutionData[]) {
	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;

	const attachmentId = this.getNodeParameter('attachmentId', index, undefined, {
		extractValue: true,
	}) as string;

	const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', index);

	// Get attachment details first
	const attachmentDetails = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/attachments/${attachmentId}`,
		undefined,
		{ $select: 'id,name,contentType' },
	);

	let mimeType: string | undefined;
	if (attachmentDetails.contentType) {
		mimeType = attachmentDetails.contentType;
	}
	const fileName = attachmentDetails.name as string;

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}/attachments/${attachmentId}/$value`,
		undefined,
		{},
		undefined,
		{},
		{ encoding: null, resolveWithFullResponse: true },
	);

	const newItem: INodeExecutionData = {
		json: items[index].json,
		binary: {},
	};

	if (items[index].binary !== undefined) {
		// Create a shallow copy of the binary data so that the old
		// data references which do not get changed still stay behind
		// but the incoming data does not get changed.
		Object.assign(newItem.binary!, items[index].binary);
	}

	const data = Buffer.from(response.body as string, 'utf8');
	newItem.binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
		data,
		fileName,
		mimeType,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(newItem),
		{ itemData: { item: index } },
	);

	return executionData;
}
