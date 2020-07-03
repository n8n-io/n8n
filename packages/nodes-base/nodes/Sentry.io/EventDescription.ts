import { INodeProperties } from 'n8n-workflow';

export const eventOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get event by ID.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events.',
			}
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const eventFields = [
/* -------------------------------------------------------------------------- */
/*                                event:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the project the events belong to.',
	},
	{
		displayName: 'Full',
		name: 'full',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'If this is set to true, then the event payload will include the full event body, including the stack trace.',
	},
/* -------------------------------------------------------------------------- */
/*                                event:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the events belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the project the events belong to.',
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'The id of the event to retrieve (either the numeric primary-key or the hexadecimal id as reported by the raven client).',
	},
] as INodeProperties[];
