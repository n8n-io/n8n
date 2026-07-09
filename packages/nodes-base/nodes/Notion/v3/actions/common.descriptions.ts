import type { INodeProperties } from 'n8n-workflow';

import {
	blockUrlExtractionRegexp,
	blockUrlValidationRegexp,
	databasePageUrlExtractionRegexp,
	databasePageUrlValidationRegexp,
	databaseUrlExtractionRegexp,
	databaseUrlValidationRegexp,
	idExtractionRegexp,
	idValidationRegexp,
} from '../../shared/constants';
import { blocks } from '../../shared/descriptions/Blocks';

export const blockId: INodeProperties = {
	displayName: 'Block',
	name: 'blockId',
	type: 'resourceLocator',
	default: { mode: 'url', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder:
				'https://www.notion.com/Block-Test-88888ccc303e4f44847f27d24bd7ad8e?pvs=4#c44444444444bbbbb4d32fdfdd84e',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: blockUrlValidationRegexp,
						errorMessage: 'Not a valid Notion Block URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: blockUrlExtractionRegexp,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: idValidationRegexp,
						errorMessage: 'Not a valid Notion Block ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: idExtractionRegexp,
			},
		},
	],
};

export const databaseLocator: INodeProperties = {
	displayName: 'Database',
	name: 'databaseId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Database',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Database...',
			typeOptions: {
				searchListMethod: 'getDatabases',
				searchable: true,
			},
		},
		{
			displayName: 'Database Link',
			name: 'url',
			type: 'string',
			placeholder:
				'https://www.notion.com/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: databaseUrlValidationRegexp,
						errorMessage: 'Not a valid Notion Database URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: databaseUrlExtractionRegexp,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: idValidationRegexp,
						errorMessage: 'Not a valid Notion Database ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: idExtractionRegexp,
			},
		},
	],
	description: 'The Notion database to operate on',
};

export const dataSourceLocator: INodeProperties = {
	displayName: 'Data Source',
	name: 'dataSourceId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Data Source',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Data Source...',
			typeOptions: {
				searchListMethod: 'getDataSources',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: idValidationRegexp,
						errorMessage: 'Not a valid Notion Data Source ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: idExtractionRegexp,
			},
		},
	],
	description: 'The Notion data source to operate on',
};

export const pageLocator: INodeProperties = {
	displayName: 'Page',
	name: 'pageId',
	type: 'resourceLocator',
	default: { mode: 'url', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder: 'https://www.notion.com/My-Page-b4eeb113e118403aa450af65ac25f0b9',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: databasePageUrlValidationRegexp,
						errorMessage: 'Not a valid Notion Page URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: databasePageUrlExtractionRegexp,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: idValidationRegexp,
						errorMessage: 'Not a valid Notion Page ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: idExtractionRegexp,
			},
		},
	],
};

export function blockBuilder(
	resource: string,
	operation: string,
	extraDisplayOptions: { contentType?: string[] } = {},
): INodeProperties {
	const show: Record<string, string[]> = {
		resource: [resource],
		operation: [operation],
	};
	if (extraDisplayOptions.contentType) {
		show.contentType = extraDisplayOptions.contentType;
	}

	return blocks(resource, operation, {
		displayOptions: { show },
		sortable: true,
	})[0];
}

export function iconOptions(resource: string, operations: string[]): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		displayOptions: { show: { resource: [resource], operation: operations } },
		options: [
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Emoji or file URL to use as the icon',
			},
		],
	};
}

export function searchOptions(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: { multipleValues: false },
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{ name: 'Ascending', value: 'ascending' },
									{ name: 'Descending', value: 'descending' },
								],
								default: 'descending',
								description: 'The direction to sort',
							},
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'options',
								options: [{ name: 'Last Edited Time', value: 'last_edited_time' }],
								default: 'last_edited_time',
								description: 'The name of the timestamp to sort against',
							},
						],
					},
				],
			},
		],
	};
}

export const returnAllOrLimit = (resource: string, operation: string): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: [resource], operation: [operation], returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

export const simplify = (resource: string, operations: string[]): INodeProperties => ({
	displayName: 'Simplify',
	name: 'simple',
	type: 'boolean',
	default: true,
	displayOptions: { show: { resource: [resource], operation: operations } },
	description: 'Whether to return a simplified version of the response instead of the raw data',
});
