import type { INodeProperties } from 'n8n-workflow';

export const workbookRLC: INodeProperties = {
	displayName: 'Workbook',
	name: 'workbook',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'url', value: '' },
	description: 'Pick the workbook by URL (no site or library needed), from the list, or by ID',
	typeOptions: {
		loadOptionsDependsOn: ['site.value', 'library.value'],
	},
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
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchWorkbooks',
				searchable: true,
			},
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
		'The SharePoint site the workbook lives in. Only needed when the workbook is chosen from the list or by ID.',
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
		'The document library the workbook lives in. Only needed when the workbook is chosen from the list or by ID.',
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

export const returnAllAndLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];

export const rawDataOutput: INodeProperties[] = [
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		default: false,
		description:
			'Whether the data should be returned RAW instead of parsed into keys according to their header',
	},
	{
		displayName: 'Data Property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				rawData: [true],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include in the response. Separate multiple fields with a comma.',
				displayOptions: {
					show: {
						'/rawData': [true],
					},
				},
			},
		],
	},
];

export const worksheetRLC: INodeProperties = {
	displayName: 'Sheet',
	name: 'worksheet',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	typeOptions: {
		// So the editor resets the chosen sheet whenever the workbook changes
		loadOptionsDependsOn: ['workbook.value'],
	},
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
	typeOptions: {
		// Tables are listed per sheet (see getTables), so reset with the sheet —
		// a workbook change cascades here through the sheet reset
		loadOptionsDependsOn: ['worksheet.value'],
	},
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
