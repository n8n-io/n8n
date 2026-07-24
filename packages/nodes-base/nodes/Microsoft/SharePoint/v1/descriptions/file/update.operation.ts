import {
	updateDisplayOptions,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { microsoftSharePointApiRequest } from '../../transport';
import {
	fileRLC,
	folderRLC,
	siteRLC,
	untilFolderSelected,
	untilSiteSelected,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve folders from',
	},
	{
		...folderRLC,
		description: 'Select the folder to update the file in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...fileRLC,
		description: 'Select the file to update',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilFolderSelected,
			},
		},
	},
	{
		displayName: 'Updated File Name',
		name: 'fileName',
		default: '',
		description: 'If not specified, the original file name will be used',
		placeholder: 'e.g. My New File',
		routing: {
			send: {
				property: 'name',
				type: 'body',
				value: '={{ $value }}',
			},
		},
		type: 'string',
	},
	{
		displayName: 'Change File Content',
		name: 'changeFileContent',
		default: false,
		description: 'Whether to update the file contents',
		placeholder: 'e.g. My New File',
		required: true,
		type: 'boolean',
	},
	{
		displayName: 'Updated File Contents',
		name: 'fileContents',
		default: '',
		description:
			'Find the name of input field containing the binary data to update the file with in the Input panel on the left, in the Binary tab',
		displayOptions: {
			show: {
				changeFileContent: [true],
			},
		},
		hint: 'The name of the input field containing the binary file data to update the file with',
		placeholder: 'data',
		required: true,
		routing: {
			output: {
				postReceive: [
					async function (
						this: IExecuteSingleFunctions,
						items: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						for (const item of items) {
							const site = this.getNodeParameter('site', undefined, {
								extractValue: true,
							}) as string;
							const file = this.getNodeParameter('file', undefined, {
								extractValue: true,
							}) as string;
							const binaryProperty = this.getNodeParameter('fileContents') as string;
							this.helpers.assertBinaryData(binaryProperty);
							const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryProperty);
							const response = await microsoftSharePointApiRequest.call(
								this,
								'PUT',
								`/sites/${site}/drive/items/${file}/content`,
								binaryDataBuffer,
							);
							item.json = response;
						}
						return items;
					},
				],
			},
		},
		type: 'string',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
