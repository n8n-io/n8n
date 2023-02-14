import type { INodeProperties } from 'n8n-workflow';

import { getLeadFields } from '../GenericFunctions';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a lead',
			},
		],
		default: 'create',
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------------
	//             lead:create
	// ----------------------------------------
	{
		displayName: 'Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [...getLeadFields()],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Custom Field',
				name: 'customFields',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Return Field Names or IDs',
				name: 'returnFields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadFields',
				},
				default: [],
				description:
					'Fields the response will include. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
