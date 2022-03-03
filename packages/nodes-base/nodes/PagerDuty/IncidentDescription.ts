import {
	INodeProperties,
} from 'n8n-workflow';

export const incidentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an incident',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an incident',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all incidents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an incident',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const incidentFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                incident:create                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'A succinct description of the nature, symptoms, cause, or effect of the incident.',
	},
	{
		displayName: 'Service ID',
		name: 'serviceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getServices',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The incident will be created on this service.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		description: `The email address of a valid user associated with the account making the request.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Escalation Policy ID',
				name: 'escalationPolicyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEscalationPolicies',
				},
				default: '',
				description: 'Delegate this incident to the specified escalation policy. Cannot be specified if an assignee is given.',
			},
			{
				displayName: 'Incident Key',
				name: 'incidentKey',
				type: 'string',
				default: '',
				description: `Sending subsequent requests referencing the same service and with the same incident_key
				 will result in those requests being rejected if an open incident matches that incident_key.`,
			},
			{
				displayName: 'Priority ID',
				name: 'priorityId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
				description: 'The incident will be created on this service.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: 'Hight',
						value: 'high',
					},
					{
						name: 'Low',
						value: 'low',
					},
				],
				default: '',
				description: 'The urgency of the incident',
			},
		],
	},
	{
		displayName: 'Conference Bridge',
		name: 'conferenceBridgeUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		placeholder: 'Add Conference Bridge',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Conference Bridge',
				name: 'conferenceBridgeValues',
				values: [
					{
						displayName: 'Conference Number',
						name: 'conferenceNumber',
						type: 'string',
						default: '',
						description: `Phone numbers should be formatted like +1 415-555-1212,,,,1234#, where a comma (,) represents a one-second wait and pound (#) completes access code input.`,
					},
					{
						displayName: 'Conference URL',
						name: 'conferenceUrl',
						type: 'string',
						default: '',
						description: 'An URL for the conference bridge. This could be a link to a web conference or Slack channel.',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 incident:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the incident.',
	},
/* -------------------------------------------------------------------------- */
/*                                 incident:getAll                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'incident',
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
				operation: [
					'getAll',
				],
				resource: [
					'incident',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Date Range',
				name: 'dateRange',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
				],
				default: '',
				description: 'When set to all, the since and until parameters and defaults are ignored.',
			},
			{
				displayName: 'Incident Key',
				name: 'incidentKey',
				type: 'string',
				default: '',
				description: `Incident de-duplication key. Incidents with child alerts do not have an incident key; querying by incident key will return incidents whose alerts have alert_key matching the given incident key.`,
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{
						name: 'Assigness',
						value: 'assigness',
					},
					{
						name: 'Acknowledgers',
						value: 'acknowledgers',
					},
					{
						name: 'Conferenece Bridge',
						value: 'conferenceBridge',
					},
					{
						name: 'Escalation Policies',
						value: 'escalationPolicies',
					},
					{
						name: 'First Trigger Log Entries',
						value: 'firstTriggerLogEntries',
					},
					{
						name: 'Priorities',
						value: 'priorities',
					},
					{
						name: 'Services',
						value: 'services',
					},
					{
						name: 'Teams',
						value: 'teams',
					},
					{
						name: 'Users',
						value: 'users',
					},
				],
				default: [],
				description: 'Additional details to include.',
			},
			{
				displayName: 'Service IDs',
				name: 'serviceIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getServices',
				},
				default: '',
				description: 'Returns only the incidents associated with the passed service(s).',
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'The start of the date range over which you want to search. (the limit on date ranges is 6 months)',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'string',
				default: '',
				placeholder: 'created_at:asc,resolved_at:desc',
				description: `Used to specify both the field you wish to sort the results on (incident_number/created_at/resolved_at/urgency), as well as the direction (asc/desc) of the results. The sort_by field and direction should be separated by a colon. A maximum of two fields can be included, separated by a comma.`,
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: [
					{
						name: 'Acknowledged',
						value: 'acknowledged',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
					{
						name: 'Triggered',
						value: 'triggered',
					},
				],
				default: '',
				description: 'Returns only the incidents associated with the passed service(s).',
			},
			{
				displayName: 'Team IDs',
				name: 'teamIds',
				type: 'string',
				default: '',
				description: 'Team IDs. Only results related to these teams will be returned. Account must have the teams ability to use this parameter. (multiples Ids can be added separated by comma)',
			},
			{
				displayName: 'Timezone',
				name: 'timeZone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				default: '',
				description: 'Time zone in which dates in the result will be rendered. If not set dates will return UTC',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'The end of the date range over which you want to search. (the limit on date ranges is 6 months)',
			},
			{
				displayName: 'Urgencies',
				name: 'urgencies',
				type: 'multiOptions',
				options: [
					{
						name: 'High',
						value: 'high',
					},
					{
						name: 'Low',
						value: 'low',
					},
				],
				default: '',
				description: 'urgencies of the incidents to be returned. Defaults to all urgencies. Account must have the urgencies ability to do this',
			},
			{
				displayName: 'User IDs',
				name: 'userIds',
				type: 'string',
				default: '',
				description: 'Returns only the incidents currently assigned to the passed user(s). This expects one or more user IDs (multiple Ids can be added separated by comma)',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                incident:update                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the incident.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
			},
		},
		description: `The email address of a valid user associated with the account making the request.`,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Escalation Level',
				name: 'escalationLevel',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Escalate the incident to this level in the escalation policy.',
			},
			{
				displayName: 'Escalation Policy ID',
				name: 'escalationPolicyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEscalationPolicies',
				},
				default: '',
				description: 'Delegate this incident to the specified escalation policy. Cannot be specified if an assignee is given.',
			},
			{
				displayName: 'Priority ID',
				name: 'priorityId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
				description: 'The incident will be created on this service.',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The resolution for this incident if status is set to resolved.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Acknowledged',
						value: 'acknowledged',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
				],
				default: '',
				description: 'The new status of the incident.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'A succinct description of the nature, symptoms, cause, or effect of the incident.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: 'Hight',
						value: 'high',
					},
					{
						name: 'Low',
						value: 'low',
					},
				],
				default: '',
				description: 'The urgency of the incident',
			},
		],
	},
	{
		displayName: 'Conference Bridge',
		name: 'conferenceBridgeUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		placeholder: 'Add Conference Bridge',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Conference Bridge',
				name: 'conferenceBridgeValues',
				values: [
					{
						displayName: 'Conference Number',
						name: 'conferenceNumber',
						type: 'string',
						default: '',
						description: `Phone numbers should be formatted like +1 415-555-1212,,,,1234#, where a comma (,) represents a one-second wait and pound (#) completes access code input.`,
					},
					{
						displayName: 'Conference URL',
						name: 'conferenceUrl',
						type: 'string',
						default: '',
						description: 'An URL for the conference bridge. This could be a link to a web conference or Slack channel.',
					},
				],
			},
		],
	},
];
