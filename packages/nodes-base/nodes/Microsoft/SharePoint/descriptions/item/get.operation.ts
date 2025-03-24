import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { untilListSelected, untilSiteSelected } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Site',
		name: 'site',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the site to retrieve lists from',
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
		displayName: 'List',
		name: 'list',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the list you want to retrieve an item from',
		displayOptions: {
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
					searchListMethod: 'getLists',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. mylist',
				type: 'string',
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
		description: 'Select the item you want to get',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getItems',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. recf7a7zp709Ecg',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
