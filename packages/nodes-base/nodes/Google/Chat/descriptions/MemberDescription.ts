import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const memberOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'member',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a membership.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Lists human memberships in a space.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const memberFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 member:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Member Name',
		name: 'memberName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'member',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Member to be retrieved in the form "spaces/*/members/*".',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 member:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name',
		name: 'spaceName',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		displayOptions: {
			show: {
				resource: [
					'member',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: [],
		description: 'The name of the space for which to retrieve members, in the form "spaces/*".',
	},

	...getPagingParameters('member'),

] as INodeProperties[];

