import {
	INodeProperties
} from 'n8n-workflow';

export const workerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'workers' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet worker',
			},
			{
				name: 'Remove',
				value: 'delete',
				description: 'Remove an Onfleet worker',
			},
			{
				name: 'List',
				value: 'getAll',
				description: 'List all Onfleet workers',
			},
			{
				name: 'List workers by location',
				value: 'getAllByLocation',
				description: 'List all Onfleet workers who are currently within a centain target area',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet worker',
			},
			{
				name: 'Get Schedule',
				value: 'getSchedule',
				description: 'Get a specific Onfleet worker schedule',
			},
			{
				name: 'Set worker\'s schedule',
				value: 'setSchedule',
				description: 'Set the worker\'s schedule',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet worker',
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
	description: 'The worker\'s name',
} as INodeProperties;

const phoneField = {
	displayName: 'Phone',
	name: 'phone',
	type: 'string',
	default: '',
	description: 'A valid phone number as per the worker\'s organization\'s country',
} as INodeProperties;

const capacityField = {
	displayName: 'Capacity',
	name: 'capacity',
	type: 'number',
	default: 0,
	description: 'The maximum number of units this worker can carry, for route optimization purposes',
} as INodeProperties;

const displayNameField = {
	displayName: 'Display name',
	name: 'displayName',
	type: 'string',
	default: '',
	description: 'This value is used in place of the worker\'s actual name within sms notifications, delivery tracking pages, and across organization boundaries',
} as INodeProperties;

// Vehicles fields
const vehicleField = {
	displayName: 'Vehicle',
	name: 'vehicle',
	type: 'boolean',
	default: false,
	description: 'Whether the worker has vehicle or not',
} as INodeProperties;

const vehicleTypeField = {
	displayName: 'Type',
	name: 'type',
	type: 'options',
	options: [
		{
			name: 'Car',
			value: 'CAR',
		},
		{
			name: 'Motorcycle',
			value: 'MOTORCYCLE',
		},
		{
			name: 'Bicycle',
			value: 'BICYCLE',
		},
		{
			name: 'Truck',
			value: 'TRUCK',
		},
	],
	default: 'CAR',
	description: 'Whether the worker has vehicle or not',
} as INodeProperties;

const vehicleDescriptionField = {
	displayName: 'Description',
	name: 'description',
	type: 'string',
	default: '',
	description: 'The vehicle\'s make, model, year, or any other relevant identifying details',
} as INodeProperties;

const vehicleLicensePlateField = {
	displayName: 'License plate',
	name: 'licensePlate',
	type: 'string',
	default: '',
	description: 'The vehicle\'s license plate number',
} as INodeProperties;

const vehicleColorField = {
	displayName: 'Color',
	name: 'color',
	type: 'string',
	default: '',
	description: 'The vehicle\'s color',
} as INodeProperties;

const teamsField = {
	displayName: 'Teams (JSON)',
	name: 'teams',
	type: 'json',
	default: '[]',
	description: 'One or more team IDs of which the worker is a member',
} as INodeProperties;

const teamsFilterField = {
	displayName: 'Teams',
	name: 'teams',
	type: 'string',
	default: '',
	description: 'A comma-separated list of the team IDs that workers must be part of',
} as INodeProperties;

const statesFilterField = {
	displayName: 'States',
	name: 'states',
	type: 'multiOptions',
	options: [
		{
			name: 'Off-duty',
			value: 0,
		},
		{
			name: 'Idle (on-duty, no active task)',
			value: 1,
		},
		{
			name: 'Active (on-duty, active task)',
			value: 2,
		},
	],
	default: '',
	description: 'List of worker states',
} as INodeProperties;

const phonesFilterField = {
	displayName: 'Phones',
	name: 'phones',
	type: 'string',
	default: '',
	description: 'A comma-separated list of workers\' phone numbers',
} as INodeProperties;

const filterField = {
	displayName: 'List of fields to return',
	name: 'filter',
	type: 'string',
	default: '',
	description: 'A comma-separated list of fields to return, if all are not desired. For example, name, location',
} as INodeProperties;

const longitudeFilterField = {
	displayName: 'Longitude',
	name: 'longitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The longitude component of the coordinate pair',
} as INodeProperties;

const latitudeFilterField = {
	displayName: 'Latitude',
	name: 'latitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The latitude component of the coordinate pair',
} as INodeProperties;

const radiusFilterField = {
	displayName: 'Radius',
	name: 'radius',
	type: 'number',
	typeOptions: {
		maxValue: 10000,
		minValue: 0,
	},
	default: 1000,
	description: 'The length in meters of the radius of the spherical area in which to look for workers. Defaults to 1000 if missing. Maximum value is 10000',
} as INodeProperties;

const scheduleDateField = {
	displayName: 'Date',
	name: 'date',
	type: 'dateTime',
	default: Date.now(),
	description: 'Schedule\'s date',
} as INodeProperties;

const scheduleTimezoneField = {
	displayName: 'Timezone',
	name: 'timezone',
	type: 'string',
	default: '',
	description: 'A valid timezone',
} as INodeProperties;

const scheduleStartField = {
	displayName: 'Start',
	name: 'start',
	type: 'dateTime',
	default: Date.now(),
	description: 'Start time',
} as INodeProperties;

const scheduleEndField = {
	displayName: 'End',
	name: 'end',
	type: 'dateTime',
	default: Date.now(),
	description: 'End time',
} as INodeProperties;

export const workerFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [
					'get',
					'getSchedule',
					'setSchedule',
					'update',
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the worker object for lookup',
	},
	{
		displayName: 'Analytics',
		name: 'analytics',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'get' ],
			},
		},
		default: true,
		required: true,
		description: 'A more detailed response, includes basic worker duty event, traveled distance (meters) and time analytics',
	},
	{
		...nameField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...phoneField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...vehicleField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [
					'create',
					'update',
				],
			},
		},
		required: true,
	},
	{
		...vehicleTypeField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [
					'create',
					'update',
				],
				vehicle: [ true ],
			},
		},
		required: true,
	},
	{
		...teamsField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...longitudeFilterField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'getAllByLocation' ],
			},
		},
		required: true,
	},
	{
		...latitudeFilterField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'getAllByLocation' ],
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
				resource: [ 'workers' ],
				operation: [ 'getAllByLocation' ],
			},
		},
		options: [ radiusFilterField ],
	},
	{
		displayName: 'Additional vehicle fields',
		name: 'additionalVehicleFields',
		type: 'collection',
		placeholder: 'Add vehicle fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [
					'create',
					'update',
				],
				vehicle: [ true ],
			},
		},
		options: [
			vehicleDescriptionField,
			vehicleLicensePlateField,
			vehicleColorField,
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
				resource: [ 'workers' ],
				operation: [ 'create' ],
			},
		},
		options: [
			capacityField,
			displayNameField,
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
				resource: [ 'workers' ],
				operation: [ 'update' ],
			},
		},
		options: [
			nameField,
			capacityField,
			displayNameField,
			teamsField,
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
				resource: [ 'workers' ],
				operation: [ 'getAll' ],
			},
		},
		options: [
			filterField,
			teamsFilterField,
			statesFilterField,
			phonesFilterField,
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
				resource: [ 'workers' ],
				operation: [ 'get' ],
			},
		},
		options: [ filterField ],
	},
	{
		...scheduleDateField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'setSchedule' ],
			},
		},
		required: true,
	},
	{
		...scheduleTimezoneField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'setSchedule' ],
			},
		},
		required: true,
	},
	{
		...scheduleStartField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'setSchedule' ],
			},
		},
		required: true,
	},
	{
		...scheduleEndField,
		displayOptions: {
			show: {
				resource: [ 'workers' ],
				operation: [ 'setSchedule' ],
			},
		},
		required: true,
	},
] as INodeProperties[];
