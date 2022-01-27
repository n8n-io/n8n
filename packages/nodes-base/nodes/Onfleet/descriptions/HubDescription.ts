import {
	INodeProperties
} from 'n8n-workflow';
import { destinationExternalField } from './DestinationDescription';

export const hubOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'hub' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet hub',
			},
			{
				name: 'Get all',
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
] as INodeProperties[];

const nameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'A name to identify the hub',
} as INodeProperties;

const teamsField = {
	displayName: 'Teams',
	name: 'teams',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getTeams',
	},
	default: [],
	description: 'These are the teams that this Hub will be assigned to',
} as INodeProperties;

export const hubFields = [
	{
		displayName: 'Hub ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'hub' ],
				operation: [ 'update' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the hub object for lookup',
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [ 'hub' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...destinationExternalField,
		displayOptions: {
			show: {
				resource: [ 'hub' ],
				operation: [
					'create',
					'update',
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
				resource: [ 'hub' ],
				operation: [ 'create' ],
			},
		},
		options: [
			{
				...teamsField,
				require: false,
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
				resource: [ 'hub' ],
				operation: [ 'update' ],
			},
		},
		options: [
			nameField,
			{
				...teamsField,
				required: false,
			},
		],
	},
] as INodeProperties[];
