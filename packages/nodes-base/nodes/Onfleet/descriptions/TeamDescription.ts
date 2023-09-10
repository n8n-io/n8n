import type { INodeProperties } from 'n8n-workflow';

export const teamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
		options: [
			{
				name: 'Auto-Dispatch',
				value: 'autoDispatch',
				description: 'Automatically dispatch tasks assigned to a team to on-duty drivers',
				action: 'Auto-dispatch a team',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet team',
				action: 'Create a team',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an Onfleet team',
				action: 'Delete a team',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific Onfleet team',
				action: 'Get a team',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many Onfleet teams',
				action: 'Get many teams',
			},
			{
				name: 'Get Time Estimates',
				value: 'getTimeEstimates',
				description: 'Get estimated times for upcoming tasks for a team, returns a selected driver',
				action: 'Get time estimates for a team',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet team',
				action: 'Update a team',
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
	description: 'A unique name for the team',
} as INodeProperties;

const workersField = {
	displayName: 'Worker Names or IDs',
	name: 'workers',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getWorkers',
	},
	default: [],
	description:
		'A list of workers. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
} as INodeProperties;

const managersField = {
	displayName: 'Administrator Names or IDs',
	name: 'managers',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getAdmins',
	},
	default: [],
	description:
		'A list of managing administrators. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
} as INodeProperties;

const hubField = {
	displayName: 'Hub Name or ID',
	name: 'hub',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getHubs',
	},
	default: '',
	description:
		'The team\'s hub. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
} as INodeProperties;

const enableSelfAssignmentField = {
	displayName: 'Self Assignment',
	name: 'enableSelfAssignment',
	type: 'boolean',
	default: false,
	description:
		"Whether or not to allow drivers to self-assign tasks that are in the Team's unassigned container",
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
} as INodeProperties;

const serviceTimeField = {
	displayName: 'Service Time',
	name: 'serviceTime',
	type: 'number',
	default: 2,
	typeOptions: {
		minValue: 0,
	},
	description:
		'The default service time to apply in Minutes to the tasks when no task service time exists',
} as INodeProperties;

const routeEndField = {
	displayName: 'Route End',
	name: 'routeEnd',
	type: 'options',
	options: [
		{
			name: 'Team’s Hub',
			value: 'team_hub',
		},
		{
			name: 'Worker Routing Address',
			value: 'worker_routing_address',
		},
		{
			name: 'Hub',
			value: 'hub',
		},
		{
			name: 'End Anywhere',
			value: 'anywhere',
		},
	],
	default: '',
	description: 'Where the route will end',
} as INodeProperties;

const maxAllowedDelayField = {
	displayName: 'Max Allowed Delay',
	name: 'maxAllowedDelay',
	type: 'number',
	default: 10,
	description: 'Max allowed time in minutes that a task can be late',
	typeOptions: {
		minValue: 1,
	},
} as INodeProperties;

const longitudeDropOffField = {
	displayName: 'Drop Off Longitude',
	name: 'dropOffLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: 0,
	description: 'The longitude for drop off location',
} as INodeProperties;

const latitudeDropOffField = {
	displayName: 'Drop Off Latitude',
	name: 'dropOffLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: 0,
	description: 'The latitude for drop off location',
} as INodeProperties;

const longitudePickupField = {
	displayName: 'Pick Up Longitude',
	name: 'pickupLongitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: 0,
	description: 'The longitude for pickup location',
} as INodeProperties;

const latitudePickupField = {
	displayName: 'Pick Up Latitude',
	name: 'pickupLatitude',
	type: 'number',
	typeOptions: {
		numberPrecision: 14,
	},
	default: 0,
	description: 'The latitude for pickup location',
} as INodeProperties;

const pickupTimeField = {
	displayName: 'Pick Up Time',
	name: 'pickupTime',
	type: 'dateTime',
	default: '',
	description:
		'If the request includes pickupLocation, pickupTime must be present if the time is fewer than 3 hours in the future',
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
	name: 'serviceTime',
	type: 'number',
	default: 120,
	typeOptions: {
		minValue: 0,
	},
	description:
		'The expected time a worker will take at the pickupLocation, dropoffLocation, or both (as applicable) Unit: seconds',
} as INodeProperties;

export const teamFields: INodeProperties[] = [
	{
		displayName: 'Team ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['get', 'update', 'delete', 'getTimeEstimates', 'autoDispatch'],
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
				resource: ['team'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		...workersField,
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		...managersField,
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create'],
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
				resource: ['team'],
				operation: ['create'],
			},
		},
		options: [hubField, enableSelfAssignmentField],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['getAll'],
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
				resource: ['team'],
				operation: ['getAll'],
				returnAll: [false],
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['update'],
			},
		},
		options: [managersField, hubField, nameField, enableSelfAssignmentField, workersField],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['autoDispatch'],
			},
		},
		options: [
			{
				displayName: 'Ending Route',
				name: 'endingRoute',
				type: 'fixedCollection',
				placeholder: 'Add Route',
				default: {},
				options: [
					{
						displayName: 'Ending Route Properties',
						name: 'endingRouteProperties',
						type: 'fixedCollection',
						default: {},
						values: [
							{
								...routeEndField,
								required: true,
							},
							{
								...hubField,
								displayOptions: {
									show: {
										routeEnd: ['hub'],
									},
								},
								required: false,
							},
						],
					},
				],
			},
			maxAllowedDelayField,
			maxTasksPerRouteField,
			{
				displayName: 'Schedule Time Window',
				name: 'scheduleTimeWindow',
				type: 'fixedCollection',
				placeholder: 'Add Time Window',
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
				placeholder: 'Add Time Window',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['getTimeEstimates'],
			},
		},
		options: [
			{
				displayName: 'Drop Off',
				name: 'dropOff',
				type: 'fixedCollection',
				placeholder: 'Add Drop Off',
				default: {},
				options: [
					{
						displayName: 'DropOff Properties',
						name: 'dropOffProperties',
						type: 'fixedCollection',
						default: {},
						values: [
							{
								...longitudeDropOffField,
								required: true,
							},
							{
								...latitudeDropOffField,
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
				default: {},
				placeholder: 'Add Pick Up',
				options: [
					{
						displayName: 'Pick Up Properties',
						name: 'pickUpProperties',
						type: 'fixedCollection',
						default: {},
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
								...pickupTimeField,
								required: false,
							},
						],
					},
				],
			},
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
];
