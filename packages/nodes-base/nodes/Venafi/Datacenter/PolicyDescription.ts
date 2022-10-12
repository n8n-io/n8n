import { INodeProperties } from 'n8n-workflow';

export const policyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['policy'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a policy',
				action: 'Get a policy',
			},
		],
		default: 'get',
	},
];

export const policyFields: INodeProperties[] = [
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
				operation: ['get'],
				resource: ['policy'],
			},
		},
		default: '',
		description: 'The Distinguished Name (DN) of the policy folder',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['policy'],
			},
		},
		options: [
			{
				displayName: 'PKCS10',
				name: 'PKCS10',
				type: 'string',
				default: '',
				description:
					'The PKCS#10 policy Signing Request (CSR). Omit escape characters such as or . If this value is provided, any Subject DN fields and the KeyBitSize in the request are ignored.',
			},
		],
	},
];
