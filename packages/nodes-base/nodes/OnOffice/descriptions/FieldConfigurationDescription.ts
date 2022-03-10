import { INodeProperties } from 'n8n-workflow';

export const fieldConfigurationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['fields'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Request field configuration',
			},
		],
		default: 'read',
		description: 'The operation to perform.',
	},
];

export const fieldConfigurationFields: INodeProperties[] = [
	{
		displayName: 'Modules',
		name: 'modules',
		type: 'multiOptions',
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: ['fields'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Address',
				value: 'address',
			},
			{
				name: 'Estate',
				value: 'estate',
			},
			{
				name: 'Agents Log',
				value: 'agentsLog',
			},
			{
				name: 'Calendar',
				value: 'calendar',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'File',
				value: 'file',
			},
			{
				name: 'News',
				value: 'news',
			},
			{
				name: 'Intranet',
				value: 'intranet',
			},
			{
				name: 'Project',
				value: 'project',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		description: 'Information about the fields of these modules will be fetched',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['fields'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include labels',
				name: 'labels',
				type: 'boolean',
				default: false,
				description: 'Determines if labels are included.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'DEU',
				description: 'Select a language. 3-letter ISO 3166-1 alpha-3 code.',
			},
			{
				displayName: 'Select Fields',
				name: 'fieldList',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
				},
				description: 'Only the fields specified here are output.',
			},
			{
				displayName: 'Show only inactive',
				name: 'showOnlyInactive',
				type: 'boolean',
				default: false,
				description: 'Show only inactive fields.',
			},
			{
				displayName: 'Correct datatypes',
				name: 'realDataTypes',
				type: 'boolean',
				default: false,
				description:
					'Show the correct data type for the data types `datei`, `user`, `redhint`, `blackhint` and `dividingline` and not text.',
			},
			{
				displayName: 'Show field measure format',
				name: 'showFieldMeasureFormat',
				type: 'boolean',
				default: false,
				description:
					'Add `fieldMeasureFormat` to the response. This parameter provides additional information about the data type or formatting of the field. ',
			},
		],
	},
];
