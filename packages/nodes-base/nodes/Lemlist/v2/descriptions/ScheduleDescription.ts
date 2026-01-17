import type { INodeProperties } from 'n8n-workflow';

export const scheduleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Associate With Campaign',
				value: 'associateWithCampaign',
				description: 'Associate a schedule with a campaign',
				action: 'Associate schedule with campaign',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new schedule',
				action: 'Create a schedule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a schedule',
				action: 'Delete a schedule',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific schedule',
				action: 'Get a schedule',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many schedules',
				action: 'Get many schedules',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a schedule',
				action: 'Update a schedule',
			},
		],
		displayOptions: {
			show: {
				resource: ['schedule'],
			},
		},
	},
];

export const scheduleFields: INodeProperties[] = [
	// ----------------------------------
	//        schedule: create
	// ----------------------------------
	{
		displayName: 'Schedule Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the schedule',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		required: true,
		default: 'Europe/Paris',
		placeholder: 'e.g. Europe/Paris, America/New_York',
		description: 'Timezone for the schedule',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['create'],
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
				resource: ['schedule'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Monday',
				name: 'monday',
				type: 'json',
				default: '{"start": "09:00", "end": "18:00"}',
				description: 'Working hours for Monday (JSON format with start and end times)',
			},
			{
				displayName: 'Tuesday',
				name: 'tuesday',
				type: 'json',
				default: '{"start": "09:00", "end": "18:00"}',
				description: 'Working hours for Tuesday (JSON format with start and end times)',
			},
			{
				displayName: 'Wednesday',
				name: 'wednesday',
				type: 'json',
				default: '{"start": "09:00", "end": "18:00"}',
				description: 'Working hours for Wednesday (JSON format with start and end times)',
			},
			{
				displayName: 'Thursday',
				name: 'thursday',
				type: 'json',
				default: '{"start": "09:00", "end": "18:00"}',
				description: 'Working hours for Thursday (JSON format with start and end times)',
			},
			{
				displayName: 'Friday',
				name: 'friday',
				type: 'json',
				default: '{"start": "09:00", "end": "18:00"}',
				description: 'Working hours for Friday (JSON format with start and end times)',
			},
			{
				displayName: 'Saturday',
				name: 'saturday',
				type: 'json',
				default: '',
				description: 'Working hours for Saturday (JSON format with start and end times)',
			},
			{
				displayName: 'Sunday',
				name: 'sunday',
				type: 'json',
				default: '',
				description: 'Working hours for Sunday (JSON format with start and end times)',
			},
		],
	},

	// ----------------------------------
	//        schedule: get
	// ----------------------------------
	{
		displayName: 'Schedule ID',
		name: 'scheduleId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the schedule to retrieve',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//        schedule: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//        schedule: update
	// ----------------------------------
	{
		displayName: 'Schedule ID',
		name: 'scheduleId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the schedule to update',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name for the schedule',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				placeholder: 'e.g. Europe/Paris',
				description: 'New timezone for the schedule',
			},
			{
				displayName: 'Monday',
				name: 'monday',
				type: 'json',
				default: '',
				description: 'Working hours for Monday (JSON format with start and end times)',
			},
			{
				displayName: 'Tuesday',
				name: 'tuesday',
				type: 'json',
				default: '',
				description: 'Working hours for Tuesday (JSON format with start and end times)',
			},
			{
				displayName: 'Wednesday',
				name: 'wednesday',
				type: 'json',
				default: '',
				description: 'Working hours for Wednesday (JSON format with start and end times)',
			},
			{
				displayName: 'Thursday',
				name: 'thursday',
				type: 'json',
				default: '',
				description: 'Working hours for Thursday (JSON format with start and end times)',
			},
			{
				displayName: 'Friday',
				name: 'friday',
				type: 'json',
				default: '',
				description: 'Working hours for Friday (JSON format with start and end times)',
			},
			{
				displayName: 'Saturday',
				name: 'saturday',
				type: 'json',
				default: '',
				description: 'Working hours for Saturday (JSON format with start and end times)',
			},
			{
				displayName: 'Sunday',
				name: 'sunday',
				type: 'json',
				default: '',
				description: 'Working hours for Sunday (JSON format with start and end times)',
			},
		],
	},

	// ----------------------------------
	//        schedule: delete
	// ----------------------------------
	{
		displayName: 'Schedule ID',
		name: 'scheduleId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the schedule to delete',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//        schedule: associateWithCampaign
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to associate the schedule with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['associateWithCampaign'],
			},
		},
	},
	{
		displayName: 'Schedule ID',
		name: 'scheduleId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the schedule to associate',
		displayOptions: {
			show: {
				resource: ['schedule'],
				operation: ['associateWithCampaign'],
			},
		},
	},
];
