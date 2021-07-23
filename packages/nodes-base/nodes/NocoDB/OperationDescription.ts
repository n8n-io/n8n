import {
	INodeProperties,
} from 'n8n-workflow';

export const operationFields = [
	// ----------------------------------
	//         Shared
	// ----------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the project',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the table',
	},
	// ----------------------------------
	//         delete
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to delete',
	},
	// ----------------------------------
	//         getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'The max number of results to return',
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: `When set to true the attachment fields define in 'Download Fields' will be downloaded.`,
	},
	{
		displayName: 'Download Fields',
		name: 'downloadFieldNames',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				downloadAttachments: [
					true,
				],
			},
		},
		default: '',
		description: `Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.`,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				default: [],
				placeholder: 'Name',
				description: 'The select fields of the returned rows',
			},
			{
				displayName: 'Filter By Formula',
				name: 'where',
				type: 'string',
				default: '',
				placeholder: '(name,like,example%)~or(name,eq,test)',
				description: 'A formula used to filter rows',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: '',
				description: 'An offset to use when retrieving rows',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort Rule',
				description: 'The sorting rules for the returned rows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Name of the field to sort on',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'ASC',
										value: 'asc',
										description: 'Sort in ascending order (small -> large)',
									},
									{
										name: 'DESC',
										value: 'desc',
										description: 'Sort in descending order (large -> small)',
									},
								],
								default: 'asc',
								description: 'The sort direction',
							},
						],
					},
				],
			},

		],
	},
	// ----------------------------------
	//         get
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to return',
	},
	// ----------------------------------
	//         update
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to update',
	},
	// ----------------------------------
	//         Shared
	// ----------------------------------
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map Input Data to Columns',
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
				operation: [
					'create',
					'update',
				],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Upload Attachments',
		name: 'uploadAttachments',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
			},
		},
		default: false,
		description: `When set to true the attachments will be uploaded to the fields defined in 'Row Fields'`,
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: '',
		required: false,
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties',
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
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'defineBelow',
				],
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
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Attachments to Upload',
		name: 'attachmentsUi',
		placeholder: 'Add Attachment',
		type: 'fixedCollection',
		typeOptions:{
			multipleValueButtonText: 'Add attachment to upload',
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Attachment',
				name: 'attachmentValues',
				values: [
					{
						displayName: 'Take input from field',
						name: 'binaryProperty',
						type: 'string',
						description: 'The field containing the binary file data to be uploaded',
						default: '',
					},
					{
						displayName: 'Row Fields',
						name: 'rowFields',
						type: 'string',
						description: `Name of the fields of type 'attachment' that should be uploaded. Multiple ones can be defined separated by comma. Case sensitive`,
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				uploadAttachments: [
					true,
				],
			},
		},
		default: '',
	},
] as INodeProperties[];
