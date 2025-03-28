import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to retrieve',
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				hint: 'Enter the container ID',
				placeholder: 'e.g. AndersenFamily',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container ID must follow the allowed pattern',
						},
					},
				],
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		type: 'boolean',
	},
];

const displayOptions = {
	show: {
		resource: ['container'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
