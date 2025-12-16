import type { INodeProperties } from 'n8n-workflow';

export const untilFolderSelected = { folder: [''] };

export const untilItemSelected = { item: [''] };

export const untilListSelected = { list: [''] };

export const untilSiteSelected = { site: [''] };

export const fileRLC: INodeProperties = {
	displayName: 'File',
	name: 'file',
	default: {
		mode: 'list',
		value: '',
	},
	description: 'Select the file to download',
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
};

export const folderRLC: INodeProperties = {
	displayName: 'Parent Folder',
	name: 'folder',
	default: {
		mode: 'list',
		value: '',
	},
	description: 'Select the folder to update the file in',
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
};

export const itemRLC: INodeProperties = {
	displayName: 'Item',
	name: 'item',
	default: {
		mode: 'list',
		value: '',
	},
	description: 'Select the item you want to delete',
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
			placeholder: 'e.g. 1',
			type: 'string',
		},
	],
	required: true,
	type: 'resourceLocator',
};

export const listRLC: INodeProperties = {
	displayName: 'List',
	name: 'list',
	default: {
		mode: 'list',
		value: '',
	},
	description: 'Select the list you want to retrieve',
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
};

export const siteRLC: INodeProperties = {
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
};
