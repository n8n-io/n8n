import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data for a specific issue.',
			},
			{
				name: 'Get Events',
				value: 'getEvents',
				description: 'Get the events for an issue.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const issueFields = [

/* -------------------------------------------------------------------------- */
/*                                issue:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Number',
		name: 'issueNumber',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
				],
			}
		},
		required: true
	},

/* -------------------------------------------------------------------------- */
/*                                issue:getEvents                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Number',
		name: 'issueNumber',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getEvents',
				],
			}
		},
		required: true
	},
] as INodeProperties[];
