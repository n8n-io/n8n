import type { INodeProperties } from 'n8n-workflow';

// The Workbook/Site/Library searchable dropdowns arrive with the site/library
// ticket, on these same fields. The Sheet and Table dropdowns are below.

export const workbookRLC: INodeProperties = {
	displayName: 'Workbook',
	name: 'workbook',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'url', value: '' },
	description: 'Pick the workbook by URL (no site or library needed) or by ID',
	modes: [
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			// A real "Copy link" URL is this messy sourcedoc/Doc.aspx shape, not a
			// clean human-readable path — a tidy example would look wrong to paste over.
			placeholder:
				'e.g. https://contoso.sharepoint.com/:x:/r/sites/mysite/_layouts/15/Doc.aspx?sourcedoc=%7B5A58BB09-…%7D&file=book.xlsx',
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
	default: { mode: 'list', value: '' },
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getSheets',
				searchable: true,
			},
		},
		{
			displayName: 'By Name or ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. Sheet1',
		},
	],
};

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'table',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getTables',
				searchable: true,
			},
		},
		{
			displayName: 'By Name or ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. Table1',
		},
	],
};
