import {
	INodeProperties
} from 'n8n-workflow';

import {
	destinationExternalField,
} from './DestinationDescription';

import {
	recipientExternalField,
} from './RecipientDescription';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'Clone',
				value: 'clone',
				description: 'Clone an Onfleet task',
				action: 'Clone a task',
			},
			{
				name: 'Complete',
				value: 'complete',
				description: 'Force-complete a started Onfleet task',
				action: 'Complete a task',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an Onfleet task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet task',
				action: 'Get a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all Onfleet tasks',
				action: 'Get all tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet task',
				action: 'Update a task',
			},
		],
		default: 'get',
	},
];

const merchantIdField = {
	displayName: 'Merchant ID',
	name: 'merchant',
	type: 'string',
	default: '',
	description: 'The ID of the organization that will be displayed to the recipient of the task',
} as INodeProperties;

const executorIdField = {
	displayName: 'Executor ID',
	name: 'executor',
	type: 'string',
	default: '',
	description: 'The ID of the organization that will be responsible for fulfilling the task',
} as INodeProperties;

const completeAfterField = {
	displayName: 'Complete After',
	name: 'completeAfter',
	type: 'dateTime',
	default: null,
	description: 'The earliest time the task should be completed',
} as INodeProperties;

const completeBeforeField = {
	displayName: 'Complete Before',
	name: 'completeBefore',
	type: 'dateTime',
	default: null,
	description: 'The latest time the task should be completed',
} as INodeProperties;

const pickupTaskField = {
	displayName: 'Pick Up Task',
	name: 'pickupTask',
	type: 'boolean',
	default: false,
	description: 'Whether the task is a pickup task',
} as INodeProperties;

const notesField = {
	displayName: 'Notes',
	name: 'notes',
	type: 'string',
	default: '',
	description: 'Notes for the task',
} as INodeProperties;

const quantityField = {
	displayName: 'Quantity',
	name: 'quantity',
	type: 'number',
	default: 0,
	description: 'The number of units to be dropped off while completing this task, for route optimization purposes',
} as INodeProperties;

const serviceTimeField = {
	displayName: 'Service Time',
	name: 'serviceTime',
	type: 'number',
	default: 0,
	description: 'The number of minutes to be spent by the worker on arrival at this task\'s destination, for route optimization purposes',
} as INodeProperties;

export const taskFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
			hide: {
				operation: [
					'create',
					'getAll',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the task object for lookup',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'task',
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
		description: 'Max number of results to return',
	},
	{
		...destinationExternalField,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		required: true,
	},
	{
		displayName: 'Complete as a Success',
		name: 'success',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'complete',
				],
			},
		},
		description: 'Whether the task\'s completion was successful',
		required: true,
		default: true,
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'The starting time of the range. Tasks created or completed at or after this time will be included.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'multiOptions',
				options: [
					{
						name: '[All]',
						value: 'all',
					},
					{
						name: 'Active',
						value: 2,
					},
					{
						name: 'Assigned',
						value: 1,
					},
					{
						name: 'Completed',
						value: 3,
					},
					{
						name: 'Unassigned',
						value: 0,
					},
				],
				default: ['all'],
				description: 'The state of the tasks',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'The ending time of the range. Defaults to current time if not specified.',
			},
		],
	},
	{
		displayName: 'Override Fields',
		name: 'overrideFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'clone',
				],
			},
		},
		options: [
			{
				...completeAfterField,
			},
			{
				...completeBeforeField,
			},
			{
				displayName: 'Include Barcodes',
				name: 'includeBarcodes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Dependencies',
				name: 'includeDependencies',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: false,
			},
			{
				...notesField,
				required: false,
			},
			{
				...pickupTaskField,
				required: false,
			},
			{
				...serviceTimeField,
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
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			completeAfterField,
			completeBeforeField,
			executorIdField,
			merchantIdField,
			notesField,
			pickupTaskField,
			quantityField,
			serviceTimeField,
		],
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
					'task',
				],
				operation: [
					'complete',
				],
			},
		},
		options: [
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Completion Notes',
			},
		],
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
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			completeAfterField,
			completeBeforeField,
			executorIdField,
			merchantIdField,
			notesField,
			pickupTaskField,
			quantityField,
			recipientExternalField,
			{
				displayName: 'Recipient Name Override',
				name: 'recipientName',
				type: 'string',
				default: '',
				description: 'Override the recipient name for this task only',
			},
			{
				displayName: 'Recipient Notes Override',
				name: 'recipientNotes',
				type: 'string',
				default: '',
				description: 'Override the recipient notes for this task only',
			},
			{
				displayName: 'Recipient Skip SMS Notifications Override',
				name: 'recipientSkipSMSNotifications',
				type: 'boolean',
				default: false,
				description: 'Whether to override the recipient notification settings for this task',
			},
			serviceTimeField,
			{
				displayName: 'Use Merchant For Proxy Override',
				name: 'useMerchantForProxy',
				type: 'boolean',
				default: false,
				description: 'Whether to override the organization ID with the merchant\'s org ID for this task',
			},
		],
	},
];
