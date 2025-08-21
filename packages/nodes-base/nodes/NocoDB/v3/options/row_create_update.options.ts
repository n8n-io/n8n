import { INodeProperties } from 'n8n-workflow';

export const DataToSendOption: INodeProperties[] = [
	// for version 3 (noco v2 api), show legacy mapping
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				version: [3],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	// for version 4 (noco v3 api), show new resouce mapping
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'mapWithFields',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				version: [4],
			},
		},
		default: 'mapWithFields',
		description: 'Whether to insert the input data this node receives in the new row',
	},
];

export const RowCreateUpdateOptions: INodeProperties[] = [
	{
		displayName:
			"In this mode, make sure the incoming data fields are named the same as the columns in NocoDB. (Use an 'Edit Fields' node before this node to change them if required.)",
		name: 'info',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataToSend: ['autoMapInputData'],
			},
		},
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				dataToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},

	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				dataToSend: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Is Binary File',
						name: 'binaryData',
						type: 'boolean',
						default: false,
						description:
							'Whether the field data to set is binary and should be taken from a binary property',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								binaryData: [false],
							},
						},
					},
					{
						displayName: 'Take Input From Field',
						name: 'binaryProperty',
						type: 'string',
						description: 'The field containing the binary file data to be uploaded',
						default: '',
						displayOptions: {
							show: {
								binaryData: [true],
							},
						},
					},
				],
			},
		],
	},
];
