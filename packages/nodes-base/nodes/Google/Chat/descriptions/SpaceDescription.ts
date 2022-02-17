import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const spaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
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
				description: 'Get a space',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all spaces the caller is a member of',
			},
		],
		default: 'get',
	},
];

export const spaceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 space:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space ID',
		name: 'spaceId',
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
		description: 'Resource name of the space, in the form "spaces/*"',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 space:getAll                               */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('space'),
];
