
import {
	INodeProperties,
} from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new activity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an activity',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all activities',
			},
			{
				name: 'Get Comments',
				value: 'getComments',
				description: 'Get all activity comments',
			},
			{
				name: 'Get Kudos',
				value: 'getKudos',
				description: 'Get all activity kudos',
			},
			{
				name: 'Get Laps',
				value: 'getLaps',
				description: 'Get all activity laps',
			},
			{
				name: 'Get Zones',
				value: 'getZones',
				description: 'Get all activity zones',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an activity',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const activityFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                activity:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The name of the activity',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Type of activity. For example - Run, Ride etc.',
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'ISO 8601 formatted date time.',
	},
	{
		displayName: 'Elapsed Time (Seconds)',
		name: 'elapsedTime',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		description: 'In seconds.',
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
					'activity',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Set to true to mark as commute.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity.',
			},
			{
				displayName: 'Distance',
				name: 'distance',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'In meters.',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Set to true to mark as a trainer activity.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                activity:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'ID or email of activity',
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
					'activity',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Set to true to mark as commute.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity.',
			},
			{
				displayName: 'Gear ID',
				name: 'gear_id',
				type: 'string',
				default: '',
				description: 'Identifier for the gear associated with the activity. ‘none’ clears gear from activity',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the activity',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'Type of activity. For example - Run, Ride etc.',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Set to true to mark as a trainer activity.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  activity:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'ID or email of activity',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  activity                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getComments',
					'getLaps',
					'getKudos',
					'getZones',
				],
			},
		},
		default: '',
		description: 'ID or email of activity',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getComments',
					'getLaps',
					'getKudos',
					'getZones',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getComments',
					'getLaps',
					'getKudos',
					'getZones',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  activity:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'activity',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
