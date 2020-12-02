import {
	INodeProperties,
} from 'n8n-workflow';

import {
	TLP,
} from '../interfaces/AlertInterface';

export const alertOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'loadAlertOptions',
		},
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
			},
		},
		default: 'create',
	},
] as INodeProperties[];

export const alertFields = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'alert',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
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
				resource: [
					'alert',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	// required attributs
	{
		displayName: 'Alert ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'promote',
					'merge',
					'update',
					'executeResponder',
					'get',
				],
			},
		},
		description: 'Title of the alert',
	},
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'merge',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Title of the alert',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Description of the alert',
	},
	{
		displayName: 'Severity',
		name: 'severity',
		type: 'options',
		options: [
			{
				name: 'Low',
				value: 1,
			},
			{
				name: 'Medium',
				value: 2,
			},
			{
				name: 'High',
				value: 3,
			},
		],
		required: true,
		default: 2,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Severity of the alert. Default=Medium',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Date and time when the alert was raised default=now',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'tag,tag2,tag3...',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Case Tags',
	},
	{
		displayName: 'TLP',
		name: 'tlp',
		type: 'options',
		required: true,
		default: 2,
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			}, {
				name: 'Red',
				value: TLP.red,
			},
		],
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Traffict Light Protocol (TLP). Default=Amber',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		options: [
			{
				name: 'New',
				value: 'New',
			},
			{
				name: 'Updated',
				value: 'Updated',
			},
			{
				name: 'Ignored',
				value: 'Ignored',
			},
			{
				name: 'Imported',
				value: 'Imported',
			},
		],
		default: 'New',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Status of the alert',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Type of the alert',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Source of the alert',
	},
	{
		displayName: 'SourceRef',
		name: 'sourceRef',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Source reference of the alert',
	},
	{
		displayName: 'Follow',
		name: 'follow',
		type: 'boolean',
		required: true,
		default: true,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'if true, the alert becomes active when updated default=true',
	},
	{
		displayName: 'Artifacts',
		name: 'artifactUi',
		type: 'fixedCollection',
		placeholder: 'Add Artifact',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Artifact',
				name: 'artifactValues',
				values: [
					{
						displayName: 'Data Type',
						name: 'dataType',
						type: 'options',
						default: '',
						options: [
							{
								name: 'IP',
								value: 'ip',
							},
							{
								name: 'Domain',
								value: 'domain',
							},
							{
								name: 'File',
								value: 'file',
							},
						],
						description: '',
					},
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						displayOptions: {
							hide: {
								dataType: [
									'file',
								],
							},
						},
						default: '',
						description: '',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryProperty',
						type: 'string',
						displayOptions: {
							show: {
								dataType: [
									'file',
								],
							},
						},
						default: 'data',
						description: '',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Case Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: '',
					},
				],
			},
		],
		description: 'Artifact attributes',
	},
	// required for responder execution
	{
		displayName: 'Responder ID',
		name: 'responder',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsDependsOn: [
				'id',
			],
			loadOptionsMethod: 'loadResponders',
		},
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'executeResponder',
				],
			},
			hide: {
				id: [
					'',
				],
			},
		},
	},
	// optional attributs (Create, Promote operations)
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		placeholder: 'Add Field',
		type: 'collection',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
					'promote',
				],
			},
		},
		options: [
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: `Case template to use when a case is created from this alert.`,
			},
		],
	},
	// optional attributs (Update operation)
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Artifacts',
				name: 'artifactUi',
				type: 'fixedCollection',
				placeholder: 'Add Artifact',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Artifact',
						name: 'artifactValues',
						values: [
							{
								displayName: 'Data Type',
								name: 'dataType',
								type: 'options',
								default: '',
								options: [
									{
										name: 'IP',
										value: 'ip',
									},
									{
										name: 'Domain',
										value: 'domain',
									},
									{
										name: 'File',
										value: 'file',
									},
								],
							},
							{
								displayName: 'Data',
								name: 'data',
								type: 'string',
								displayOptions: {
									hide: {
										dataType: [
											'file',
										],
									},
								},
								default: '',
							},
							{
								displayName: 'Binary Property',
								name: 'binaryProperty',
								type: 'string',
								displayOptions: {
									show: {
										dataType: [
											'file',
										],
									},
								},
								default: 'data',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Case Tags',
								name: 'tags',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				required: false,
				default: '',
				description: `Case template to use when a case is created from this alert.`,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
				description: 'Description of the alert.',
			},
			{
				displayName: 'Follow',
				name: 'follow',
				type: 'boolean',
				default: true,
				description: 'if true, the alert becomes active when updated default=true.',
			},
			{
				displayName: 'Severity',
				name: ' severity',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
				],
				default: 2,
				description: 'Severity of the alert. Default=Medium',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'New',
						value: 'New',
					},
					{
						name: 'Updated',
						value: 'Updated',
					},
					{
						name: 'Ignored',
						value: 'Ignored',
					},
					{
						name: 'Imported',
						value: 'Imported',
					},
				],
				default: 'New',
			},
			{
				displayName: 'Case Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag,tag2,tag3...',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: false,
				default: '',
				description: 'Title of the alert.',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				required: false,
				default: 2,
				options: [
					{
						name: 'White',
						value: TLP.white,
					},
					{
						name: 'Green',
						value: TLP.green,
					},
					{
						name: 'Amber',
						value: TLP.amber,
					},
					{
						name: 'Red',
						value: TLP.red,
					},
				],
				description: 'Traffict Light Protocol (TLP). Default=Amber',
			},
		],
	},
	//Query attributs (Search operation)
	{
		displayName: 'Options',
		name: 'options',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'alert',
				],
			},
		},
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				default: '',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		placeholder: 'Add Filter',
		default: {},
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'getAll',
					'count',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the alert.',
			},
			{
				displayName: 'Follow',
				name: 'follow',
				type: 'boolean',
				default: false,
				description: 'if true, the alert becomes active when updated default=true',
			},
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
				],
				default: 2,
				description: 'Severity of the alert. Default=Medium',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag,tag2,tag3...',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'TLP',
				name: 'tlp',
				type: 'options',
				default: 2,
				options: [
					{
						name: 'White',
						value: TLP.white,
					},
					{
						name: 'Green',
						value: TLP.green,
					},
					{
						name: 'Amber',
						value: TLP.amber,
					},
					{
						name: 'Red',
						value: TLP.red,
					},
				],
				description: 'Traffict Light Protocol (TLP). Default=Amber',
			},
		],
	},
] as INodeProperties[];
