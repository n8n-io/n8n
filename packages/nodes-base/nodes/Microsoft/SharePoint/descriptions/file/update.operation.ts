import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { untilSiteSelected } from '../../helpers/utils';
import { microsoftSharePointApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Site',
		name: 'site',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the site to retrieve folders from',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getSites',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. mysite',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Parent Folder',
		name: 'folder',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the folder to update the file in',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
			hide: {
				...untilSiteSelected,
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getFolders',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. myfolder',
				type: 'string',
			},
		],
		placeholder: '/ (Library root)',
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'File',
		name: 'file',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the file to update',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getFiles',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. mysite',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Updated File Name',
		name: 'fileName',
		default: '',
		description: 'If not specified, the original file name will be used',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
		},
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
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
			},
		},
		placeholder: 'e.g. My New File',
		required: true,
		type: 'boolean',
	},
	{
		displayName: 'Updated File Contents',
		name: 'fileContents',
		default: '',
		description:
			'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['update'],
				changeFileContent: [true],
			},
		},
		hint: 'The name of the input field containing the binary file data to update the file',
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
						for (const _item of items) {
							const site = this.getNodeParameter('site.value') as string;
							const file = this.getNodeParameter('file.value') as string;
							const binaryProperty = this.getNodeParameter('fileContents') as string;
							this.helpers.assertBinaryData(binaryProperty);
							const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryProperty);
							await microsoftSharePointApiRequest.call(
								this,
								'PUT',
								`/sites/${site}/drive/items/${file}/content`,
								binaryDataBuffer,
							);
						}
						return items;
					},
				],
			},
		},
		type: 'string',
	},
];
