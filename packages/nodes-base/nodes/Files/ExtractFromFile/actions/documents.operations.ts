import mammoth from 'mammoth';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: 'The name of the input binary field containing the file to be extracted',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Extract Style Information',
				name: 'extractStyleInfo',
				type: 'boolean',
				default: false,
				description: 'Whether to extract style information as well as the content',
				displayOptions: {
					show: {
						'/operation': ['docx'],
					},
				},
			},
			{
				displayName: 'Keep Source',
				name: 'keepSource',
				type: 'options',
				default: 'json',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Include JSON data of the input item',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Include binary data of the input item',
					},
					{
						name: 'Both',
						value: 'both',
						description: 'Include both JSON and binary data of the input item',
					},
				],
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: 'text',
				options: [
					{
						name: 'Plain Text',
						value: 'text',
						description: 'Extract as plain text without formatting',
					},
					{
						name: 'HTML',
						value: 'html',
						description: 'Extract as HTML to preserve basic formatting',
					},
				],
				displayOptions: {
					show: {
						'/operation': ['docx'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['docx'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const operations = ['doc', 'docx'];

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const operation = this.getNodeParameter('operation', itemIndex);
			const options = this.getNodeParameter('options', itemIndex, {}) as {
				extractStyleInfo?: boolean;
				includeNotes?: boolean;
				keepSource?: 'json' | 'binary' | 'both';
				outputFormat?: 'text' | 'html';
			};

			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex);

			const item = items[itemIndex];

			if (!item.binary?.[binaryPropertyName]) {
				throw new NodeOperationError(
					this.getNode(),
					`No binary data property "${binaryPropertyName}" exists on item!`,
					{ itemIndex },
				);
			}

			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

			let extractedData;
			if (operation === 'docx') {
				const mammothOptions = {
					buffer,
					styleMap: options.extractStyleInfo ? undefined : ['* => *'],
				};

				let newItem;
				if (options.outputFormat === 'html') {
					extractedData = await mammoth.convertToHtml(mammothOptions);
					const newItemHtml: INodeExecutionData = {
						json: {
							html: extractedData.value,
						},
					};
					newItem = newItemHtml;
				} else {
					extractedData = await mammoth.extractRawText(mammothOptions);

					const newItemText: INodeExecutionData = {
						json: {
							text: extractedData.value,
						},
					};
					newItem = newItemText;
				}

				// Include warnings if any occurred during extraction
				if (extractedData.messages.length > 0) {
					newItem.json.warnings = extractedData.messages;
				}

				// Handle keeping source data based on options
				if (options.keepSource === 'json' || options.keepSource === 'both') {
					newItem.json = { ...item.json, ...newItem.json };
				}
				if (options.keepSource === 'binary' || options.keepSource === 'both') {
					newItem.binary = item.binary;
				}
				returnData.push(newItem);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			throw new NodeOperationError(this.getNode(), error, { itemIndex });
		}
	}
	return returnData;
}
