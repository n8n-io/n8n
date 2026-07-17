import type { INodeProperties } from 'n8n-workflow';

// The searchable dropdowns arrive in later tickets, on these same fields.

export const workbookRLC: INodeProperties = {
	displayName: 'Workbook',
	name: 'workbook',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'url', value: '' },
	description: 'The workbook to operate on. Choosing it by URL needs no site or library.',
	modes: [
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite/Shared Documents/book.xlsx',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://.+',
						errorMessage: 'The URL must start with https://',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7',
		},
	],
};

export const siteRLC: INodeProperties = {
	displayName: 'Site',
	name: 'site',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description:
		'The SharePoint site the workbook lives in. Only needed when the workbook is chosen by ID.',
	// Field-shape-compatible with the site-selection component SharePoint 2.0
	// is building (ENT-182), so the two can converge later.
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchSites',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://.+',
						errorMessage: 'The URL must start with https://',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. contoso.sharepoint.com,5a58bb09-…,9f0d…',
		},
	],
};

export const libraryRLC: INodeProperties = {
	displayName: 'Document Library',
	name: 'library',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description:
		'The document library the workbook lives in. Only needed when the workbook is chosen by ID.',
	typeOptions: {
		// So the editor re-fetches the library list whenever the chosen site changes.
		loadOptionsDependsOn: ['site.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchLibraries',
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. b!x4mNq…',
		},
	],
};

export const worksheetRLC: INodeProperties = {
	displayName: 'Sheet',
	name: 'worksheet',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'id', value: '' },
	description: 'The sheet to operate on',
	modes: [
		{
			displayName: 'By Name or ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. Sheet1',
		},
	],
};
