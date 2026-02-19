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
				description: 'Purchase and register a new phone number',
				action: 'Create a phone number',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a phone number',
				action: 'Delete a phone number',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a phone number',
				action: 'Get a phone number',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many phone numbers',
				action: 'Get many phone numbers',
			},
		],
		default: 'create',
	},
];

export const phoneNumberFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          phoneNumber:create                                 */
	/* -------------------------------------------------------------------------- */
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
				displayName: 'Area Code',
				name: 'areaCode',
				type: 'number',
				default: 0,
				description: 'The area code for the phone number to purchase',
			},
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'options',
				default: 'US',
				options: [
					{
						name: 'Canada',
						value: 'CA',
					},
					{
						name: 'United States',
						value: 'US',
					},
				],
				description: 'The country code for the phone number',
			},
			{
				displayName: 'Inbound Agent ID',
				name: 'inboundAgentId',
				type: 'string',
				default: '',
				description: 'The agent ID to assign for inbound calls on this number',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
				description: 'A friendly name for the phone number',
			},
			{
				displayName: 'Outbound Agent ID',
				name: 'outboundAgentId',
				type: 'string',
				default: '',
				description: 'The agent ID to assign for outbound calls on this number',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            phoneNumber:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: '+14155551234',
		description: 'The phone number to retrieve, in E.164 format',
	},

	/* -------------------------------------------------------------------------- */
	/*                          phoneNumber:getMany                                */
	/* -------------------------------------------------------------------------- */
	// No additional parameters needed -- the API returns all phone numbers

	/* -------------------------------------------------------------------------- */
	/*                          phoneNumber:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['phoneNumber'],
				operation: ['delete'],
			},
		},
		default: '',
		placeholder: '+14155551234',
		description: 'The phone number to delete, in E.164 format',
	},
];
