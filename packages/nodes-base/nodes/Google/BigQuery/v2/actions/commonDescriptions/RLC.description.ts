import type { INodeProperties } from 'n8n-workflow';

export const projectRLC: INodeProperties = {
	displayName: 'Project',
	name: 'projectId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchProjects',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/console.cloud.google.com\\/bigquery\\?project=([0-9a-zA-Z\\-_]+).{0,}',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex:
							'https:\\/\\/console.cloud.google.com\\/bigquery\\?project=([0-9a-zA-Z\\-_]+).{0,}',
						errorMessage: 'Not a valid BigQuery Project URL',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid BigQuery Project ID',
					},
				},
			],
			url: '=https://console.cloud.google.com/bigquery?project={{$value}}',
		},
	],
	description: 'Projects to which you have been granted any project role',
};

export const datasetRLC: INodeProperties = {
	displayName: 'Dataset',
	name: 'datasetId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchDatasets',
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
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid Dataset ID',
					},
				},
			],
		},
	],
};

export const tableRLC: INodeProperties = {
	displayName: 'Table',
	name: 'tableId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchTables',
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
						regex: '[a-zA-Z0-9\\-_]{2,}',
						errorMessage: 'Not a valid Table ID',
					},
				},
			],
		},
	],
};
