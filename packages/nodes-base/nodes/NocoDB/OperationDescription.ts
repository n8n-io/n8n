import { INodeProperties } from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	// ----------------------------------
	//         Shared
	// ----------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				version: [1],
			},
		},
		required: true,
		description: 'The ID of the project',
	},
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				version: [2],
			},
		},
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
	},
	{
		displayName: 'Table Name or ID',
		name: 'table',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				version: [2],
			},
		},
		required: true,
		description:
			'The table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: ['projectId'],
			loadOptionsMethod: 'getTables',
		},
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				version: [1],
			},
		},
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
				operation: ['delete'],
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
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		default: false,
		description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
	},
	{
		displayName: 'Download Fields',
		name: 'downloadFieldNames',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				downloadAttachments: [true],
			},
		},
		default: '',
		description:
			"Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
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
				operation: ['get'],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to return',
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: false,
		description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
	},
	{
		displayName: 'Download Fields',
		name: 'downloadFieldNames',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				downloadAttachments: [true],
			},
		},
		default: '',
		description:
			"Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.",
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
				operation: ['update'],
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
				operation: ['create', 'update'],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create', 'update'],
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
				operation: ['create', 'update'],
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
						displayName: 'Is Binary Data',
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
