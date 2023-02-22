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
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9]{2,}',
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
