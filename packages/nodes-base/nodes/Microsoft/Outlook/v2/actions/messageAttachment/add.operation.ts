import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	messageRLC,
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		hint: 'The name of the input field containing the binary file data to be attached',
		type: 'string',
		required: true,
		default: 'data',
		placeholder: 'e.g. data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				description:
					'Filename of the attachment. If not set will the file-name of the binary property be used, if it exists.',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['messageAttachment'],
		operation: ['add'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number, items: INodeExecutionData[]) {
	let responseData;

	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;

	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
	const options = this.getNodeParameter('options', index);

	if (items[index].binary === undefined) {
		throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
	}

	if (
		items[index].binary &&
		(items[index].binary as IDataObject)[binaryPropertyName] === undefined
	) {
		throw new NodeOperationError(
			this.getNode(),
			`No binary data property "${binaryPropertyName}" does not exists on item!`,
			{ itemIndex: index },
		);
	}

	const binaryData = items[index].binary[binaryPropertyName];
	const dataBuffer = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

	const fileName = options.fileName === undefined ? binaryData.fileName : options.fileName;

	if (!fileName) {
		throw new NodeOperationError(
			this.getNode(),
			'File name is not set. It has either to be set via "Additional Fields" or has to be set on the binary property!',
			{ itemIndex: index },
		);
	}

	// Check if the file is over 3MB big
	if (dataBuffer.length > 3e6) {
		// Maximum chunk size is 4MB
		const chunkSize = 4e6;
		const body: IDataObject = {
			AttachmentItem: {
				attachmentType: 'file',
				name: fileName,
				size: dataBuffer.length,
			},
		};

		// Create upload session
		responseData = await microsoftApiRequest.call(
			this,
			'POST',
			`/messages/${messageId}/attachments/createUploadSession`,
			body,
		);
		const uploadUrl = responseData.uploadUrl;

		if (uploadUrl === undefined) {
			throw new NodeApiError(this.getNode(), responseData as JsonObject, {
				message: 'Failed to get upload session',
			});
		}

		for (let bytesUploaded = 0; bytesUploaded < dataBuffer.length; bytesUploaded += chunkSize) {
			// Upload the file chunk by chunk
			const nextChunk = Math.min(bytesUploaded + chunkSize, dataBuffer.length);
			const contentRange = `bytes ${bytesUploaded}-${nextChunk - 1}/${dataBuffer.length}`;

			const data = dataBuffer.subarray(bytesUploaded, nextChunk);

			responseData = await this.helpers.request(uploadUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/octet-stream',
					'Content-Length': data.length,
					'Content-Range': contentRange,
				},
				body: data,
			});
		}
	} else {
		const body: IDataObject = {
			'@odata.type': '#microsoft.graph.fileAttachment',
			name: fileName,
			contentBytes: binaryData.data,
		};

		responseData = await microsoftApiRequest.call(
			this,
			'POST',
			`/messages/${messageId}/attachments`,
			body,
			{},
		);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray({ success: true }),
		{ itemData: { item: index } },
	);

	return executionData;
}
