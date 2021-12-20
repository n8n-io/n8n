import {
	INodeProperties
} from 'n8n-workflow';

export const teamOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'teams' ],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'create',
				description: 'Add a new Onfleet team.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet team.',
			},
			{
				name: 'Remove',
				value: 'delete',
				description: 'Remove an Onfleet team.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet team.',
			},
			{
				name: 'List',
				value: 'getAll',
				description: 'List all Onfleet teams.',
			},
		],
		default: 'getAll',
	},
] as INodeProperties[];

const nameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'A unique name for the team.',
} as INodeProperties;

const workersField = {
	displayName: 'Workers (JSON)',
	name: 'workers',
	type: 'json',
	default: '[]',
	description: 'An array of workers IDs.',
} as INodeProperties;

const managersField = {
	displayName: 'Administrators (JSON)',
	name: 'managers',
	type: 'json',
	default: '[]',
	description: 'An array of managing administrator IDs.',
} as INodeProperties;

const hubField = {
	displayName: 'Hub',
	name: 'hub',
	type: 'string',
	default: '',
	description: 'The ID of the team\'s hub.',
} as INodeProperties;

const enableSelfAssignmentField = {
	displayName: 'Self assignment',
	name: 'enableSelfAssignment',
	type: 'boolean',
	default: false,
	description: 'This toggles Team Self-Assignment that allows Drivers to Self Assign Tasks that are in the Team unassigned container.',
} as INodeProperties;

export const teamFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [
					'get',
					'update',
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the team object for lookup.',
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...workersField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...managersField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'create' ],
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
				resource: [ 'teams' ],
				operation: [ 'create' ],
			},
		},
		options: [
			hubField,
			enableSelfAssignmentField,
		],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'update' ],
			},
		},
		options: [
			nameField,
			workersField,
			managersField,
			hubField,
			enableSelfAssignmentField,
		],
	},
] as INodeProperties[];
