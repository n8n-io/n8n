import type { INodeProperties } from 'n8n-workflow';

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
			placeholder: 'e.g. 01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7',
			validation: [
				{
					type: 'regex',
					properties: {
						// A work account returns `01A2B3…`; a personal one `<driveId>!<itemId>`, where
						// the separator arrives as `!` or percent-encoded as `%21`. The pattern is
						// anchored by the validator, so it must cover both shapes.
						regex: '[a-zA-Z0-9]{2,}((!|%21)[a-zA-Z0-9]+)*',
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
			placeholder: 'e.g. {00000000-0001-0000-0000-000000000000}',
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
			placeholder: 'e.g. {21EAB2B0-DD1A-4E5B-9931-1C4D8A0D7A31}',
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
