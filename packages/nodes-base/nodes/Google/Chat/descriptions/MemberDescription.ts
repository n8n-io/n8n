import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const memberOperations: INodeProperties[] = [
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
				description: 'Get a membership',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all memberships in a space',
			},
		],
		default: 'get',
	},
];


export const memberFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 member:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Member ID',
		name: 'memberId',
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
		description: 'Member to be retrieved in the form "spaces/*/members/*"',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 member:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name/ID',
		name: 'spaceId',
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
		description: 'The name of the space for which to retrieve members, in the form "spaces/*"',
	},

	...getPagingParameters('member'),
];

