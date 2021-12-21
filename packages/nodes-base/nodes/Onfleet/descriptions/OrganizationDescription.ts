import {
	INodeProperties
} from 'n8n-workflow';

export const organizationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'organizations' ],
			},
		},
		options: [
			{
				name: 'Get details',
				value: 'get',
				description: 'Retrieve your own organization\'s details.',
			},
			{
				name: 'Get delegatee details',
				value: 'getDelegatee',
				description: 'Retrieve the details of an organization with which you are connected.',
			},

		],
		default: 'get',
	},
] as INodeProperties[];

export const organizationFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'organizations' ],
				operation: [ 'getDelegatee' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the delegatees for lookup.',
	},
] as INodeProperties[];
