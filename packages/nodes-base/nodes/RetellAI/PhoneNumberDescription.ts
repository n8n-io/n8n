import type { INodeProperties } from 'n8n-workflow';

export const phoneNumberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a phone number',
				routing: {
					request: {
						method: 'POST',
						url: '/create-phone-number',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a phone number',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/delete-phone-number/{{$parameter.phoneNumber}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a phone number',
				routing: {
					request: {
						method: 'GET',
						url: '=/get-phone-number/{{$parameter.phoneNumber}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many phone numbers',
				routing: {
					request: {
						method: 'GET',
						url: '/list-phone-numbers',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a phone number',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/update-phone-number/{{$parameter.phoneNumber}}',
					},
				},
			},
		],
		default: 'create',
	},
];

export const phoneNumberFields: INodeProperties[] = [
	// Create operation fields
	{
		displayName: 'Area Code',
		name: 'areaCode',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Area code of the number to obtain (3 digit integer)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Inbound Agent',
				name: 'inboundAgentId',
				type: 'string',
				default: '',
				description: 'Agent ID to handle inbound calls',
			},
			{
				displayName: 'Outbound Agent',
				name: 'outboundAgentId',
				type: 'string',
				default: '',
				description: 'Agent ID to handle outbound calls',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
				description: 'Nickname for the phone number',
			},
		],
	},

	// Get/Delete/Update operation fields
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['get', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The phone number in E.164 format (e.g., +14157774444)',
	},

	// Update operation fields
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Inbound Agent',
				name: 'inboundAgentId',
				type: 'string',
				default: '',
				description: 'New agent ID to handle inbound calls, or null to disable inbound calls',
			},
			{
				displayName: 'Outbound Agent',
				name: 'outboundAgentId',
				type: 'string',
				default: '',
				description: 'New agent ID to handle outbound calls, or null to disable outbound calls without override',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
				description: 'New nickname for the phone number',
			},
		],
	},

	// List operation fields
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
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
				resource: ['phoneNumber'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Area Code',
				name: 'areaCode',
				type: 'number',
				default: '',
				description: 'Filter by area code',
			},
			{
				displayName: 'Inbound Agent ID',
				name: 'inboundAgentId',
				type: 'string',
				default: '',
				description: 'Filter by inbound agent ID',
			},
			{
				displayName: 'Outbound Agent ID',
				name: 'outboundAgentId',
				type: 'string',
				default: '',
				description: 'Filter by outbound agent ID',
			},
		],
	},
];