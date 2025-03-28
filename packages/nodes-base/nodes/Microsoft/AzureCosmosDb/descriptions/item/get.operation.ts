import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { untilContainerSelected, untilItemSelected } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to use',
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
				placeholder: 'e.g. UsersContainer',
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
		displayName: 'Item',
		name: 'item',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the item to get',
		displayOptions: {
			hide: {
				...untilContainerSelected,
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchItems',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				hint: 'Enter the item ID',
				placeholder: 'e.g. AndersenFamily',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The item ID must follow the allowed pattern',
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
		displayOptions: {
			hide: {
				...untilContainerSelected,
				...untilItemSelected,
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			hide: {
				...untilContainerSelected,
				...untilItemSelected,
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				default: '',
				hint: 'Only required if a custom partition key is set for the container',
				type: 'string',
			},
		],
		placeholder: 'Add Partition Key',
		type: 'collection',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
