import {
	INodeProperties,
} from 'n8n-workflow';

import {
	TLP,
} from '../interfaces/AlertInterface';

export const alertOperations: INodeProperties[] = [
	{
		displayName: 'Operation Name or ID',
		name: 'operation',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		noDataExpression: true,
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
];

export const alertFields: INodeProperties[] = [
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
		description: 'Whether to return all results or only up to a given limit',
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
		description: 'Max number of results to return',
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
					'markAsRead',
					'markAsUnread',
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
		description: 'Severity of the alert. Default=Medium.',
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
		description: 'Traffict Light Protocol (TLP). Default=Amber.',
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
		description: 'Whether the alert becomes active when updated default=true',
	},
	{
		displayName: 'Artifacts',
		name: 'artifactUi',
		type: 'fixedCollection',
		placeholder: 'Add Artifact',
		default: {},
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
						displayName: 'Data Type Name or ID',
						name: 'dataType',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'loadObservableTypes',
						},
						description: 'Type of the observable. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'Artifact attributes',
	},
	// required for responder execution
	{
		displayName: 'Responder Name or ID',
		name: 'responder',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
					'create',
					'update',
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
		default: {},
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
		options: [
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: 'Case template to use when a case is created from this alert',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Custom Field',
				options: [
					{
						name: 'customFields',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'loadCustomFields',
								},
								default: 'Custom Field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom Field value. Use an expression if the type is not a string.',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFieldsJson',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'/jsonParameters': [
							true,
						],
					},
				},
				description: 'Custom fields in JSON format. Overrides Custom Fields UI if set.',
			},
		],
	},
	// optional attributs (Promote operation)

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		placeholder: 'Add Field',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'alert',
				],
				operation: [
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
				description: 'Case template to use when a case is created from this alert',
			},
		],
	},
	// optional attributs (Update operation)
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Artifact',
						name: 'artifactValues',
						values: [
							{
								displayName: 'Data Type Name or ID',
								name: 'dataType',
								type: 'options',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'loadObservableTypes',
								},
								description: 'Type of the observable. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				placeholder: 'Add Custom Field',
				options: [
					{
						name: 'customFields',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'loadCustomFields',
								},
								default: 'Custom Field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom Field value. Use an expression if the type is not a string.',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFieldsJson',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							true,
						],
					},
				},
				default: '',
				description: 'Custom fields in JSON format. Overrides Custom Fields UI if set.',
			},
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: 'Case template to use when a case is created from this alert',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the alert',
			},
			{
				displayName: 'Follow',
				name: 'follow',
				type: 'boolean',
				default: true,
				description: 'Whether the alert becomes active when updated default=true',
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
				description: 'Severity of the alert. Default=Medium.',
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
				default: '',
				description: 'Title of the alert',
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
				description: 'Traffict Light Protocol (TLP). Default=Amber.',
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
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Custom Field',
				options: [
					{
						name: 'customFields',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'loadCustomFields',
								},
								default: 'Custom Field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom Field value. Use an expression if the type is not a string.',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the alert',
			},
			{
				displayName: 'Follow',
				name: 'follow',
				type: 'boolean',
				default: false,
				description: 'Whether the alert becomes active when updated default=true',
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
				description: 'Severity of the alert. Default=Medium.',
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
				description: 'Traffict Light Protocol (TLP). Default=Amber.',
			},
		],
	},
];
