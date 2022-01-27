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
				resource: [ 'organization' ],
			},
		},
		options: [
			{
				name: 'Get My Organization',
				value: 'get',
				description: 'Retrieve your own organization\'s details',
			},
			{
				name: 'Get Delegatee Details',
				value: 'getDelegatee',
				description: 'Retrieve the details of an organization with which you are connected',
			},

		],
		default: 'get',
	},
] as INodeProperties[];

export const organizationFields = [
	{
		displayName: 'Organiation ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'organization' ],
				operation: [ 'getDelegatee' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the delegatees for lookup',
	},
] as INodeProperties[];
