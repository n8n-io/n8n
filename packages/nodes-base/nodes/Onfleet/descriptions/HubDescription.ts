import {
	INodeProperties
} from 'n8n-workflow';

export const hubOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'hubs',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'create',
				description: 'Add new Onfleet hub.',
			},
			{
				name: 'List hubs',
				value: 'getAll',
				description: 'List Onfleet hubs.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet hub.',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

const nameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'A name to identify the hub.',
} as INodeProperties;

const teamsField = {
	displayName: 'Teams (JSON)',
	name: 'teams',
	type: 'json',
	default: '[]',
	description: 'This is the team ID(s) that this Hub will be assigned to.',
} as INodeProperties;

export const hubFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'hubs',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the object for lookup.',
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [
					'hubs',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'hubs',
				],
				operation: [
					'create',
				],
			},
		},
		options: [ teamsField ],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'hubs',
				],
				operation: [
					'update',
				],
			},
		}, 
		options: [ nameField, teamsField ],
	},
] as INodeProperties[];
