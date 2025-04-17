import type { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new activity',
				action: 'Create an activity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an activity',
				action: 'Get an activity',
			},
			{
				name: 'Get Comments',
				value: 'getComments',
				description: 'Get all activity comments',
				action: 'Get all activity comments',
			},
			{
				name: 'Get Kudos',
				value: 'getKudos',
				description: 'Get all activity kudos',
				action: 'Get all activity kudos',
			},
			{
				name: 'Get Laps',
				value: 'getLaps',
				description: 'Get all activity laps',
				action: 'Get all activity laps',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many activities',
				action: 'Get many activities',
			},
			{
				name: 'Get Streams',
				value: 'getStreams',
				description: 'Get activity streams',
				action: 'Get all activity streams',
			},
			{
				name: 'Get Zones',
				value: 'getZones',
				description: 'Get all activity zones',
				action: 'Get all activity zones',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an activity',
				action: 'Update an activity',
			},
		],
		default: 'create',
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
				resource: ['activity'],
				operation: ['create'],
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
				resource: ['activity'],
				operation: ['create'],
				'@version': [1],
			},
		},
		default: '',
		description: 'Type of activity. For example - Run, Ride etc.',
	},
	{
		displayName: 'Sport Type',
		name: 'sport_type',
		type: 'options',
		options: [
			{ name: 'Alpine Ski', value: 'AlpineSki' },
			{ name: 'Backcountry Ski', value: 'BackcountrySki' },
			{ name: 'Badminton', value: 'Badminton' },
			{ name: 'Canoeing', value: 'Canoeing' },
			{ name: 'Crossfit', value: 'Crossfit' },
			{ name: 'EBike Ride', value: 'EBikeRide' },
			{ name: 'Elliptical', value: 'Elliptical' },
			{ name: 'EMountain Bike Ride', value: 'EMountainBikeRide' },
			{ name: 'Golf', value: 'Golf' },
			{ name: 'Gravel Ride', value: 'GravelRide' },
			{ name: 'Handcycle', value: 'Handcycle' },
			{ name: 'HIIT', value: 'HighIntensityIntervalTraining' },
			{ name: 'Hike', value: 'Hike' },
			{ name: 'Ice Skate', value: 'IceSkate' },
			{ name: 'Inline Skate', value: 'InlineSkate' },
			{ name: 'Kayaking', value: 'Kayaking' },
			{ name: 'Kitesurf', value: 'Kitesurf' },
			{ name: 'Mountain Bike Ride', value: 'MountainBikeRide' },
			{ name: 'Nordic Ski', value: 'NordicSki' },
			{ name: 'Pickleball', value: 'Pickleball' },
			{ name: 'Pilates', value: 'Pilates' },
			{ name: 'Racquetball', value: 'Racquetball' },
			{ name: 'Ride', value: 'Ride' },
			{ name: 'Rock Climbing', value: 'RockClimbing' },
			{ name: 'Roller Ski', value: 'RollerSki' },
			{ name: 'Rowing', value: 'Rowing' },
			{ name: 'Run', value: 'Run' },
			{ name: 'Sail', value: 'Sail' },
			{ name: 'Skateboard', value: 'Skateboard' },
			{ name: 'Snowboard', value: 'Snowboard' },
			{ name: 'Snowshoe', value: 'Snowshoe' },
			{ name: 'Soccer', value: 'Soccer' },
			{ name: 'Squash', value: 'Squash' },
			{ name: 'Stair Stepper', value: 'StairStepper' },
			{ name: 'Stand Up Paddling', value: 'StandUpPaddling' },
			{ name: 'Surfing', value: 'Surfing' },
			{ name: 'Swim', value: 'Swim' },
			{ name: 'Table Tennis', value: 'TableTennis' },
			{ name: 'Tennis', value: 'Tennis' },
			{ name: 'Trail Run', value: 'TrailRun' },
			{ name: 'Velomobile', value: 'Velomobile' },
			{ name: 'Virtual Ride', value: 'VirtualRide' },
			{ name: 'Virtual Row', value: 'VirtualRow' },
			{ name: 'Virtual Run', value: 'VirtualRun' },
			{ name: 'Walk', value: 'Walk' },
			{ name: 'Weight Training', value: 'WeightTraining' },
			{ name: 'Wheelchair', value: 'Wheelchair' },
			{ name: 'Windsurf', value: 'Windsurf' },
			{ name: 'Workout', value: 'Workout' },
			{ name: 'Yoga', value: 'Yoga' },
		],
		default: 'Run',
		description: 'Type of sport',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
			hide: {
				'@version': [1],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		description: 'ISO 8601 formatted date time',
	},
	{
		displayName: 'Elapsed Time (Seconds)',
		name: 'elapsedTime',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		description: 'In seconds',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Whether to mark as commute',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity',
			},
			{
				displayName: 'Distance',
				name: 'distance',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'In meters',
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Whether to mark as a trainer activity',
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
				resource: ['activity'],
				operation: ['update'],
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
				resource: ['activity'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Commute',
				name: 'commute',
				type: 'boolean',
				default: false,
				description: 'Whether to mark as commute',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the activity',
			},
			{
				displayName: 'Gear ID',
				name: 'gear_id',
				type: 'string',
				default: '',
				description:
					'Identifier for the gear associated with the activity. ‘none’ clears gear from activity.',
			},
			{
				displayName: 'Mute Activity',
				name: 'hide_from_home',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Do not publish to Home or Club feeds',
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
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Sport Type',
				name: 'sport_type',
				type: 'options',
				options: [
					{ name: 'Alpine Ski', value: 'AlpineSki' },
					{ name: 'Backcountry Ski', value: 'BackcountrySki' },
					{ name: 'Badminton', value: 'Badminton' },
					{ name: 'Canoeing', value: 'Canoeing' },
					{ name: 'Crossfit', value: 'Crossfit' },
					{ name: 'EBike Ride', value: 'EBikeRide' },
					{ name: 'Elliptical', value: 'Elliptical' },
					{ name: 'EMountain Bike Ride', value: 'EMountainBikeRide' },
					{ name: 'Golf', value: 'Golf' },
					{ name: 'Gravel Ride', value: 'GravelRide' },
					{ name: 'Handcycle', value: 'Handcycle' },
					{ name: 'HIIT', value: 'HighIntensityIntervalTraining' },
					{ name: 'Hike', value: 'Hike' },
					{ name: 'Ice Skate', value: 'IceSkate' },
					{ name: 'Inline Skate', value: 'InlineSkate' },
					{ name: 'Kayaking', value: 'Kayaking' },
					{ name: 'Kitesurf', value: 'Kitesurf' },
					{ name: 'Mountain Bike Ride', value: 'MountainBikeRide' },
					{ name: 'Nordic Ski', value: 'NordicSki' },
					{ name: 'Pickleball', value: 'Pickleball' },
					{ name: 'Pilates', value: 'Pilates' },
					{ name: 'Racquetball', value: 'Racquetball' },
					{ name: 'Ride', value: 'Ride' },
					{ name: 'Rock Climbing', value: 'RockClimbing' },
					{ name: 'Roller Ski', value: 'RollerSki' },
					{ name: 'Rowing', value: 'Rowing' },
					{ name: 'Run', value: 'Run' },
					{ name: 'Sail', value: 'Sail' },
					{ name: 'Skateboard', value: 'Skateboard' },
					{ name: 'Snowboard', value: 'Snowboard' },
					{ name: 'Snowshoe', value: 'Snowshoe' },
					{ name: 'Soccer', value: 'Soccer' },
					{ name: 'Squash', value: 'Squash' },
					{ name: 'Stair Stepper', value: 'StairStepper' },
					{ name: 'Stand Up Paddling', value: 'StandUpPaddling' },
					{ name: 'Surfing', value: 'Surfing' },
					{ name: 'Swim', value: 'Swim' },
					{ name: 'Table Tennis', value: 'TableTennis' },
					{ name: 'Tennis', value: 'Tennis' },
					{ name: 'Trail Run', value: 'TrailRun' },
					{ name: 'Velomobile', value: 'Velomobile' },
					{ name: 'Virtual Ride', value: 'VirtualRide' },
					{ name: 'Virtual Row', value: 'VirtualRow' },
					{ name: 'Virtual Run', value: 'VirtualRun' },
					{ name: 'Walk', value: 'Walk' },
					{ name: 'Weight Training', value: 'WeightTraining' },
					{ name: 'Wheelchair', value: 'Wheelchair' },
					{ name: 'Windsurf', value: 'Windsurf' },
					{ name: 'Workout', value: 'Workout' },
					{ name: 'Yoga', value: 'Yoga' },
				],
				default: 'Run',
				description: 'Type of sport',
				displayOptions: {
					hide: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Trainer',
				name: 'trainer',
				type: 'boolean',
				default: false,
				description: 'Whether to mark as a trainer activity',
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
				resource: ['activity'],
				operation: ['get'],
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
				resource: ['activity'],
				operation: ['getComments', 'getLaps', 'getKudos', 'getZones', 'getStreams'],
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
				resource: ['activity'],
				operation: ['getComments', 'getLaps', 'getKudos', 'getZones'],
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
				resource: ['activity'],
				operation: ['getComments', 'getLaps', 'getKudos', 'getZones'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Keys',
		name: 'keys',
		type: 'multiOptions',
		options: [
			{
				name: 'Altitude',
				value: 'altitude',
			},
			{
				name: 'Cadence',
				value: 'cadence',
			},
			{
				name: 'Distance',
				value: 'distance',
			},
			{
				name: 'Gradient',
				value: 'grade_smooth',
			},
			{
				name: 'Heartrate',
				value: 'heartrate',
			},
			{
				name: 'Latitude / Longitude',
				value: 'latlng',
			},
			{
				name: 'Moving',
				value: 'moving',
			},
			{
				name: 'Temperature',
				value: 'temp',
			},
			{
				name: 'Time',
				value: 'time',
			},
			{
				name: 'Velocity',
				value: 'velocity_smooth',
			},
			{
				name: 'Watts',
				value: 'watts',
			},
		],
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getStreams'],
			},
		},
		required: true,
		default: [],
		description: 'Desired stream types to return',
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
				resource: ['activity'],
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
				resource: ['activity'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
