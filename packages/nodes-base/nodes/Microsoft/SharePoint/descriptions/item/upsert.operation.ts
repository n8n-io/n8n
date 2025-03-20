import type { INodeProperties } from 'n8n-workflow';

import { itemColumnsPreSend, untilListSelected, untilSiteSelected } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'Site',
		name: 'site',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the site to retrieve lists from',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['upsert'],
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
		displayName: 'List',
		name: 'list',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the list you want to create or update an item in',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['upsert'],
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
		displayName: 'Columns',
		name: 'columns',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['upsert'],
			},
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
		noDataExpression: true,
		required: true,
		routing: {
			send: {
				preSend: [itemColumnsPreSend],
			},
		},
		type: 'resourceMapper',
		typeOptions: {
			loadOptionsDependsOn: ['site.value', 'list.value'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'upsert',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
	},
];
