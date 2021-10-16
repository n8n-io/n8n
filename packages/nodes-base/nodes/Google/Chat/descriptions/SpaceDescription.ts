import {
	INodeProperties,
} from 'n8n-workflow';

export const spaceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a space.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Lists spaces the caller is a member of.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  spaceFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 space:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Resource name of the space, in the form "spaces/*".',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'space',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
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
					'space',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				typeOptions: {
					minValue: 1,
					numberStepSize: 1,
				},
				default: '',
				description: 'Requested page size. The value is capped at 1000. Server may return fewer results than requested. If unspecified, server will default to 100.',
			},
			{
				displayName: 'Page Token',
				name: 'pageToken',
				type: 'string',
				default: '',
				description: 'A token identifying a page of results the server should return.',
			},
		],
	},

] as INodeProperties[];
