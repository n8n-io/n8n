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
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet team',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet team',
			},
			{
				name: 'Remove',
				value: 'delete',
				description: 'Remove an Onfleet team',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet team',
			},
			{
				name: 'List',
				value: 'getAll',
				description: 'List all Onfleet teams',
			},
			{
				name: 'Auto-Dispatch',
				value: 'autoDispatch',
				description: 'Dynamically dispatching tasks on the fly',
			},
			{
				name: 'Get time estimates',
				value: 'getTimeEstimates',
				description: 'The Driver Time Estimates endpoint allows an API user to get estimated times for tasks that haven\'t been created yet',
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
	description: 'A unique name for the team',
} as INodeProperties;

const workersField = {
	displayName: 'Workers (JSON)',
	name: 'workers',
	type: 'json',
	default: '[]',
	description: 'An array of workers IDs',
} as INodeProperties;

const managersField = {
	displayName: 'Administrators (JSON)',
	name: 'managers',
	type: 'json',
	default: '[]',
	description: 'An array of managing administrator IDs',
} as INodeProperties;

const hubField = {
	displayName: 'Hub',
	name: 'hub',
	type: 'string',
	default: '',
	description: 'The ID of the team\'s hub',
} as INodeProperties;

const enableSelfAssignmentField = {
	displayName: 'Self assignment',
	name: 'enableSelfAssignment',
	type: 'boolean',
	default: false,
	description: 'This toggles Team Self-Assignment that allows Drivers to Self Assign Tasks that are in the Team unassigned container',
} as INodeProperties;

const maxTasksPerRouteField = {
	displayName: 'Max number of tasks per route',
	name: 'maxTasksPerRoute',
	type: 'number',
	default: 100,
	typeOptions: {
		maxValue: 200,
		minValue: 1,
	},
	description: 'Total number of tasks allowed on a route',
}as INodeProperties;

const taskTimeWindowField = {
	displayName: 'Task time window (JSON)',
	name: 'taskTimeWindow',
	type: 'json',
	default: '{}',
	description: 'This is the time window of tasks to include in the optimization. Param must be an array of length 2 in unix time in seconds precision, [start, end]',
} as INodeProperties;

const scheduleTimeWindowField = {
	displayName: 'Schedule time window (JSON)',
	name: 'scheduleTimeWindow',
	type: 'json',
	default: '{}',
	description: 'This is the Driver\'s scheduled time window. Param must be an array of length 2 in unix time in seconds precision, [start, end]',
} as INodeProperties;

const serviceTimeField = {
	displayName: 'Service time',
	name: 'serviceTIme',
	type: 'number',
	default: 2,
	typeOptions: {
		minValue: 0,
	},
	description: 'The default service time to apply in Minutes to the tasks when no task service time exists',
} as INodeProperties;

const routeEndField = {
	displayName: 'Route end',
	name: 'routeEnd',
	type: 'string',
	default: '',
	description: 'Where the route will end',
} as INodeProperties;

const maxAllowedDelayField = {
	displayName: 'Max allowed delay',
	name: 'maxAllowedDelay',
	type: 'number',
	default: 10,
	description: '',
	typeOptions: {
		minValue: 1,
	},
} as INodeProperties;

const dropoffField = {
	displayName: 'Dropoff',
	name: 'dropoff',
	type: 'boolean',
	default: false,
	description: 'Dropoff',
} as INodeProperties;

const pickupField = {
	displayName: 'Pickup',
	name: 'pickup',
	type: 'boolean',
	default: false,
	description: 'Pickup',
} as INodeProperties;

const longitudeDropoffField = {
	displayName: 'Dropoff longitude',
	name: 'dropoffLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The longitude for dropoff location',
} as INodeProperties;

const latitudeDropoffField = {
	displayName: 'Dropoff latitude',
	name: 'dropoffLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The latitude for dropoff location',
} as INodeProperties;

const longitudePickupField = {
	displayName: 'Pickup longitude',
	name: 'pickupLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The longitude for pickup location',
} as INodeProperties;

const latitudePickupField = {
	displayName: 'Pickup latitude',
	name: 'pickupLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The latitude for pickup location',
} as INodeProperties;

const pickupTimeField = {
	displayName: 'Pickup time',
	name: 'pickupTime',
	type: 'dateTime',
	default: Date.now(),
	description: 'If the request includes pickupLocation pickupTime must be present if the time is fewer than 3 hours in the future',
} as INodeProperties;

const restrictedVehicleTypesField = {
	displayName: 'Restricted vehicle types',
	name: 'restrictedVehicleTypes',
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
	description: 'Vehicle types to ignore in the query',
} as INodeProperties;

const serviceTimeEstimateField = {
	displayName: 'Service time',
	name: 'serviceTIme',
	type: 'number',
	default: 120,
	typeOptions: {
		minValue: 0,
	},
	description: 'The expected time a worker will take at the pickupLocation, dropoffLocation, or both (as applicable) Unit: seconds',
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
					'getTimeEstimates',
					'autoDispatch',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the team object for lookup',
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
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'autoDispatch' ],
			},
		},
		options: [
			maxTasksPerRouteField,
			taskTimeWindowField,
			scheduleTimeWindowField,
			serviceTimeField,
			routeEndField,
			maxAllowedDelayField,
		],
	},
	{
		...dropoffField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
			},
		},
	},
	{
		...longitudeDropoffField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
				dropoff: [ true ],
			},
		},
	},
	{
		...latitudeDropoffField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
				dropoff: [ true ],
			},
		},
	},
	{
		...pickupField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
			},
		},
	},
	{
		...longitudePickupField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
				pickup: [ true ],
			},
		},
	},
	{
		...latitudePickupField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
				pickup: [ true ],
			},
		},
	},
	{
		...pickupTimeField,
		displayOptions: {
			show: {
				resource: [ 'teams' ],
				operation: [ 'getTimeEstimates' ],
				pickup: [ true ],
			},
		},
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
				operation: [ 'getTimeEstimates' ],
			},
		},
		options: [
			restrictedVehicleTypesField,
			serviceTimeEstimateField,
		],
	},
] as INodeProperties[];
