import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                contact:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'SMS',
		name: 'sms',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Attributes',
				name: 'attributesUi',
				placeholder: 'Add Attribute',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attributesValues',
						displayName: 'Attribute',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'options',
								typeOptions: {
									loadOptions: {
										routing: {
											request: {
												method: 'GET',
												url: '/v3/contacts/attributes',
											},
											output: {
												postReceive: [
													{
														type: 'rootProperty',
														properties: {
															property: 'attributes',
														},
													},
													{
														type: 'setKeyValue',
														properties: {
															name: '={{$responseItem.name}} - ({{$responseItem.category}})',
															value: '={{$responseItem.name}}',
														},
													},
													{
														type: 'sort',
														properties: {
															key: 'name',
														},
													},
												],
											},
										},
									},
								},
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
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                contact:getAll                             */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	displayOptions: {
		show: {
			resource: [
				'contact',
			],
			operation: [
				'getAll',
			],
		},
	},
	default: false,
	routing: {
		request: {
			method: 'GET',
			url: 'contacts',
		},
		send: {
			paginate: true,
		},
		output: {
			postReceive: [
				{
					type: 'rootProperty',
					properties: {
						property: 'contacts',
					},
				},
				{
					type: 'set',
					properties: {
						value: '={{ { "success": true } }}',
						// value: '={{ { "success": $response } }}', // Also possible to use the original response data
					},
				},
			],
		},
	},
	description: 'Whether to return all results or only up to a given limit',
},
{
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	displayOptions: {
		show: {
			resource: [
				'contact',
			],
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
		maxValue: 500,
	},
	default: 10,
	routing: {
		output: {
			maxResults: '={{$value}}', // Set maxResults to the value of current parameter
		},
	},
	description: 'Max number of results to return',
},
];
