import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				binaryData: [false],
			},
		},
		placeholder: '',
		description: 'The text content of the file to upload',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				binaryData: [true],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'File Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'invoice_1.pdf',
		description: 'The name the file should be saved as',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: false,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the response only contain the ID of the file. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Parents',
		name: 'parents',
		type: 'string',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		description: 'The IDs of the parent folders which contain the file',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'APP Properties',
				name: 'appPropertiesUi',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description:
					'A collection of arbitrary key-value pairs which are private to the requesting app',
				options: [
					{
						name: 'appPropertyValues',
						displayName: 'APP Property',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the key',
							},
						],
					},
				],
			},
			{
				displayName: 'Properties',
				name: 'propertiesUi',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'A collection of arbitrary key-value pairs which are visible to all apps',
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the key to add',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the key',
							},
						],
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
