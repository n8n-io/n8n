import {
	INodeProperties,
} from 'n8n-workflow';

export const policyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'policy',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a policy',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const policyFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 policy:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Policy DN',
		name: 'policyDn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'policy',
				],
			},
		},
		default: '',
		description: 'The Distinguished Name (DN) of the policy folder.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'policy',
				],
			},
		},
		options: [
			{
				displayName: 'PKCS10',
				name: 'PKCS10',
				type: 'string',
				default: '',
				description: 'The PKCS#10 policy Signing Request (CSR). Omit escape characters such as \n or \r\n. If this value is provided, any Subject DN fields and the KeyBitSize in the request are ignored.',
			},
		],
	},
] as INodeProperties[];
