import type { INodeProperties } from 'n8n-workflow';

import { getPagingParameters } from '../GenericFunctions';

export const memberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['member'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a membership',
				action: 'Get a member',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many memberships in a space',
				action: 'Get many members',
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
				resource: ['member'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Member to be retrieved in the form "spaces/*/members/*"',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 member:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name or ID',
		name: 'spaceId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['getAll'],
			},
		},
		default: [],
		description:
			'The name of the space for which to retrieve members, in the form "spaces/*". Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},

	...getPagingParameters('member'),
];
