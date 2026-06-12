import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

const WORKBOOK_SOURCE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Everything',
		value: 'all',
		description:
			'Search across your OneDrive plus the shared and SharePoint files you can access (returns the most relevant matches, so very large libraries may not list every file)',
	},
	{
		name: 'OneDrive (Personal)',
		value: 'oneDrive',
		description: 'Only the files in your own OneDrive',
	},
	{
		name: 'SharePoint Sites',
		value: 'sharePoint',
		description:
			'Search the SharePoint document libraries you can access (returns the most relevant matches, so very large libraries may not list every file)',
	},
];

const workbookSourceDescription =
	'Where to look for workbooks. Leave on OneDrive for your own files, or pick a wider source to reach shared and SharePoint workbooks.';

// A single option meant to live inside an operation's collapsible options
// collection. It is intentionally not version-gated: when it is left unset the
// effective default is decided in code by node version (see resolveWorkbookSource),
// so existing nodes (< 2.3) keep listing the user's own OneDrive while new nodes
// (>= 2.3) search everything.
export const workbookSourceOption: INodeProperties = {
	displayName: 'Source',
	name: 'workbookSource',
	type: 'options',
	default: 'all',
	description: workbookSourceDescription,
	options: WORKBOOK_SOURCE_OPTIONS,
};

// Ready-made "Options" collection holding just the Source option, for operations
// that have no existing options/filters collection to nest it in. Operations that
// already have one nest `workbookSourceOption` directly instead.
export const workbookSourceCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [workbookSourceOption],
};

export const workbookRLC: INodeProperties = {
	displayName: 'Workbook',
	name: 'workbook',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
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
			validation: [
				{
					type: 'regex',
					// n8n anchors this pattern with ^...$ (see node-helpers.ts), so it must
					// cover every character a workbook value can contain: a Graph drive-item
					// ID, plus the "/" that separates the drive id in From-List/search values
					// (e.g. "{driveId}/{itemId}"). The previous `[a-zA-Z0-9]{2,}` rejected
					// valid IDs containing - or _ (the expression-mode workaround skipped it).
					properties: {
						regex: '[a-zA-Z0-9!._=/-]{2,}',
						errorMessage: 'Not a valid Workbook ID',
					},
				},
			],
		},
	],
};

export const worksheetRLC: INodeProperties = {
	displayName: 'Sheet',
	name: 'worksheet',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getWorksheetsList',
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '{[a-zA-Z0-9\\-_]{2,}}',
						errorMessage: 'Not a valid Sheet ID',
					},
				},
			],
		},
	],
};

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'table',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getWorksheetTables',
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '{[a-zA-Z0-9\\-_]{2,}}',
						errorMessage: 'Not a valid Table ID',
					},
				},
			],
		},
	],
};

export const rawDataOutput: INodeProperties = {
	displayName: 'Raw Data Output',
	name: 'rawDataOutput',
	type: 'fixedCollection',
	default: { values: { rawData: false } },
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'RAW Data',
					name: 'rawData',
					type: 'boolean',
					// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
					default: 0,
					description:
						'Whether the data should be returned RAW instead of parsed into keys according to their header',
				},
				{
					displayName: 'Data Property',
					name: 'dataProperty',
					type: 'string',
					default: 'data',
					required: true,
					displayOptions: {
						show: {
							rawData: [true],
						},
					},
					description: 'The name of the property into which to write the RAW data',
				},
			],
		},
	],
	displayOptions: {
		hide: {
			'/dataMode': ['nothing'],
		},
	},
};
