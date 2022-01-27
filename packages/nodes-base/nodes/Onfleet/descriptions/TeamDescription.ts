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
				resource: [ 'team' ],
			},
		},
		options: [
			{
				name: 'Auto-Dispatch',
				value: 'autoDispatch',
				description: 'Dynamically dispatching tasks on the fly',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet team',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an Onfleet team',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet team',
			},
			{
				name: 'Get all',
				value: 'getAll',
				description: 'List all Onfleet teams',
			},
			{
				name: 'Get time estimates',
				value: 'getTimeEstimates',
				description: 'The Driver Time Estimates endpoint allows an API user to get estimated times for tasks that haven\'t been created yet',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet team',
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
	displayName: 'Workers',
	name: 'workers',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getWorkers',
	},
	default: [],
	description: 'A list of workers',
} as INodeProperties;

const managersField = {
	displayName: 'Administrators',
	name: 'managers',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getAdmins',
	},
	default: [],
	description: 'A list of managing administrator',
} as INodeProperties;

const hubField = {
	displayName: 'Hub',
	name: 'hub',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getHubs',
	},
	default: '',
	description: 'The team\'s hub',
} as INodeProperties;

const enableSelfAssignmentField = {
	displayName: 'Self Assignment',
	name: 'enableSelfAssignment',
	type: 'boolean',
	default: false,
	description: 'This toggles Team Self-Assignment that allows Drivers to Self Assign Tasks that are in the Team unassigned container',
} as INodeProperties;

const maxTasksPerRouteField = {
	displayName: 'Max Number Of Tasks Per Route',
	name: 'maxTasksPerRoute',
	type: 'number',
	default: 100,
	typeOptions: {
		maxValue: 200,
		minValue: 1,
	},
	description: 'Total number of tasks allowed on a route',
}as INodeProperties;

const serviceTimeField = {
	displayName: 'Service Time',
	name: 'serviceTIme',
	type: 'number',
	default: 2,
	typeOptions: {
		minValue: 0,
	},
	description: 'The default service time to apply in Minutes to the tasks when no task service time exists',
} as INodeProperties;

const routeEndField = {
	displayName: 'Route End',
	name: 'routeEnd',
	type: 'string',
	default: '',
	description: 'Where the route will end',
} as INodeProperties;

const maxAllowedDelayField = {
	displayName: 'Max Allowed Delay',
	name: 'maxAllowedDelay',
	type: 'number',
	default: 10,
	description: '',
	typeOptions: {
		minValue: 1,
	},
} as INodeProperties;

const longitudeDropoffField = {
	displayName: 'Dropoff Longitude',
	name: 'dropoffLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The longitude for dropoff location',
} as INodeProperties;

const latitudeDropoffField = {
	displayName: 'Dropoff Latitude',
	name: 'dropoffLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The latitude for dropoff location',
} as INodeProperties;

const longitudePickupField = {
	displayName: 'Pick Up Longitude',
	name: 'pickupLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The longitude for pickup location',
} as INodeProperties;

const latitudePickupField = {
	displayName: 'Pick Up Latitude',
	name: 'pickupLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: '',
	description: 'The latitude for pickup location',
} as INodeProperties;

const pickupTimeField = {
	displayName: 'Pick Up Time',
	name: 'pickupTime',
	type: 'dateTime',
	default: '',
	description: 'If the request includes pickupLocation pickupTime must be present if the time is fewer than 3 hours in the future',
} as INodeProperties;

const restrictedVehicleTypesField = {
	displayName: 'Restricted Vehicle Types',
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
	displayName: 'Service Time',
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
		displayName: 'Team ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'team' ],
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
				resource: [ 'team' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...workersField,
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		...managersField,
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'create' ],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'create' ],
			},
		},
		options: [
			hubField,
			enableSelfAssignmentField,
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
				resource: [ 'team' ],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'autoDispatch' ],
			},
		},
		options: [
			maxAllowedDelayField,
			maxTasksPerRouteField,
			routeEndField,
			{
				displayName: 'Schedule Time Window',
				name: 'scheduleTimeWindow',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Schedule Time Window Properties',
						name: 'scheduleTimeWindowProperties',
						type: 'fixedCollection',
						default: {},
						values: [
							{
								displayName: 'Start Time',
								name: 'startTime',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'endTime',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			serviceTimeField,
			{
				displayName: 'Task Time Window',
				name: 'taskTimeWindow',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Task Time Window Properties',
						name: 'taskTimeWindowProperties',
						type: 'fixedCollection',
						default: {},
						values: [
							{
								displayName: 'Start Time',
								name: 'startTime',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'endTime',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Dropoff',
		name: 'dropoff',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'getTimeEstimates' ],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Dropoff Properties',
				name: 'dropoffProperties',
				values: [
					{
						...longitudeDropoffField,
						required: true,
					},
					{
						...latitudeDropoffField,
						required: true,
					},
				],
			},
		],
	},
	{
		displayName: 'Pick Up',
		name: 'pickUp',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'getTimeEstimates' ],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Pick Up Properties',
				name: 'pickUpProperties',
				values: [
					{
						...longitudePickupField,
						required: true,
					},
					{
						...latitudePickupField,
						required: true,
					},
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						options: [
							{
								...pickupTimeField,
								required: false,
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'team' ],
				operation: [ 'getTimeEstimates' ],
			},
		},
		options: [
			{
				...restrictedVehicleTypesField,
				required: false,
			},
			{
				...serviceTimeEstimateField,
				required: false,
			},
		],
	},
] as INodeProperties[];
