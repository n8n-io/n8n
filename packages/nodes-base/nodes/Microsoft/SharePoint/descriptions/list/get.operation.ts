import type { INodeProperties } from 'n8n-workflow';

import { untilSiteSelected } from '../../helpers/utils';

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
				resource: ['list'],
				operation: ['get'],
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
				placeholder: 'e.g. 3978c2c3-589e-4afe-9d11-ea39920ce644',
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
		description: 'Select the list you want to retrieve',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['get'],
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
		displayName: 'Simplify',
		name: 'simplify',
		default: true,
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['get'],
			},
		},
		routing: {
			send: {
				property: '$select',
				type: 'query',
				value:
					'={{ $value ? "id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl" : undefined }}',
			},
		},
		type: 'boolean',
	},
];
