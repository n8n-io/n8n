import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { untilSiteSelected, uploadFilePreSend } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Site',
		name: 'site',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the site to retrieve folders from',
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
		description: 'Select the folder to upload the file to',
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
		displayName: 'File Name',
		name: 'fileName',
		default: '',
		description: 'The name of the file being uploaded',
		placeholder: 'e.g. My New File',
		required: true,
		type: 'string',
	},
	{
		displayName: 'File Contents',
		name: 'fileContents',
		default: '',
		description:
			'Find the name of input field containing the binary data to upload the file in the Input panel on the left, in the Binary tab',
		hint: 'The name of the input field containing the binary file data to update the file',
		placeholder: 'data',
		required: true,
		routing: {
			send: {
				preSend: [uploadFilePreSend],
			},
		},
		type: 'string',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
