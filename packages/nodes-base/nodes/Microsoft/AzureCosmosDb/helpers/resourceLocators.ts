import type { INodeProperties } from 'n8n-workflow';

import { untilContainerSelected } from './utils';

export const containerResourceLocator: INodeProperties = {
	displayName: 'Container',
	name: 'container',
	default: {
		mode: 'list',
		value: '',
	},
	description: 'Select the container you want to delete',
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
};

export const itemResourceLocator: INodeProperties = {
	displayName: 'Item',
	name: 'item',
	default: {
		mode: 'list',
		value: '',
	},
	description: "Select the item's ID",
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
};
