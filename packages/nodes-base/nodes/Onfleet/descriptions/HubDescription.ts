import {
	INodeProperties
} from 'n8n-workflow';

import {
	destinationExternalField,
} from './DestinationDescription';

export const hubOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet hub',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all Onfleet hubs',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet hub',
			},
		],
		default: 'getAll',
	},
];

const nameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'A name to identify the hub',
} as INodeProperties;

const teamsField = {
	displayName: 'Teams Names/IDs',
	name: 'teams',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getTeams',
	},
	default: [],
	description: 'These are the teams that this Hub will be assigned to',
} as INodeProperties;

export const hubFields: INodeProperties[] = [
	{
		displayName: 'Hub ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the hub object for lookup',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 64,
		},
		default: 64,
		description: 'How many results to return',
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		...destinationExternalField,
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				...teamsField,
				required: false,
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'hub',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				...destinationExternalField,
				required: false,
			},
			nameField,
			{
				...teamsField,
				required: false,
			},
		],
	},
];
