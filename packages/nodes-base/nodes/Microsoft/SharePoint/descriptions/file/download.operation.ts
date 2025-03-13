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
		description: 'Select the site to retrieve folders from',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
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
		description: 'Select the folder to download the file from',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
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
				placeholder: 'e.g. folder1/folder2',
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
		description: 'Select the file to download',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
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
		placeholder: 'eg. my-file.pdf',
		required: true,
		type: 'resourceLocator',
	},
];
