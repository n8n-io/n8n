import type { INodeProperties } from 'n8n-workflow';

export const searchJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['searchJob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a search job',
				action: 'Create a search job',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a search job',
				action: 'Delete a search job',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search job',
				action: 'Get a search job',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many search jobs',
				action: 'Get many search jobs',
			},
		],
		default: 'create',
	},
];

export const searchJobFields: INodeProperties[] = [
	// ----------------------------------------
	//            searchJob: create
	// ----------------------------------------
	{
		displayName: 'Query',
		name: 'search',
		description:
			'Search language string to execute, in Splunk\'s <a href="https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual">Search Processing Language</a>',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Ad hoc search level',
				name: 'adhoc_search_level',
				type: 'options',
				default: 'verbose',
				options: [
					{
						name: 'Fast',
						value: 'fast',
					},
					{
						name: 'Smart',
						value: 'smart',
					},
					{
						name: 'Verbose',
						value: 'verbose',
					},
				],
			},
			{
				displayName: 'Auto-cancel after (seconds)',
				name: 'auto_cancel',
				type: 'number',
				default: 0,
				description: 'Seconds after which the search job automatically cancels',
			},
			{
				displayName: 'Auto-finalize after (num events)',
				name: 'auto_finalize_ec',
				type: 'number',
				default: 0,
				description: 'Auto-finalize the search after at least this many events are processed',
			},
			{
				displayName: 'Auto pause after (seconds)',
				name: 'auto_pause',
				type: 'number',
				default: 0,
				description: 'Seconds of inactivity after which the search job automatically pauses',
			},
			{
				displayName: 'Earliest index',
				name: 'index_earliest',
				type: 'dateTime',
				default: '',
				description: 'The earliest index time for the search (inclusive)',
			},
			{
				displayName: 'Earliest time',
				name: 'earliest_time',
				type: 'dateTime',
				default: '',
				description: 'The earliest cut-off for the search (inclusive)',
			},
			{
				displayName: 'Exec mode',
				name: 'exec_mode',
				type: 'options',
				default: 'blocking',
				options: [
					{
						name: 'Blocking',
						value: 'blocking',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'One shot',
						value: 'oneshot',
					},
				],
			},
			{
				displayName: 'Indexed real time offset',
				name: 'indexedRealtimeOffset',
				type: 'number',
				default: 0,
				description: 'Seconds of disk sync delay for indexed real-time search',
			},
			{
				displayName: 'Latest index',
				name: 'index_latest',
				type: 'dateTime',
				default: '',
				description: 'The latest index time for the search (inclusive)',
			},
			{
				displayName: 'Latest time',
				name: 'latest_time',
				type: 'dateTime',
				default: '',
				description: 'The latest cut-off for the search (inclusive)',
			},
			{
				displayName: 'Max time',
				name: 'max_time',
				type: 'number',
				default: 0,
				description:
					'Number of seconds to run this search before finalizing. Enter <code>0</code> to never finalize.',
			},
			{
				displayName: 'Namespace',
				name: 'namespace',
				type: 'string',
				default: '',
				description: 'Application namespace in which to restrict searches',
			},
			{
				displayName: 'Reduce frequency',
				name: 'reduce_freq',
				type: 'number',
				default: 0,
				description: 'How frequently to run the MapReduce reduce phase on accumulated map values',
			},
			{
				displayName: 'Remote server list',
				name: 'remote_server_list',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of (possibly wildcarded) servers from which raw events should be pulled. This same server list is to be used in subsearches.',
			},
			{
				displayName: 'Reuse limit (seconds)',
				name: 'reuse_max_seconds_ago',
				type: 'number',
				default: 0,
				description:
					'Number of seconds ago to check when an identical search is started and return the job’s search ID instead of starting a new job',
			},
			{
				displayName: 'Required field',
				name: 'rf',
				type: 'string',
				default: '',
				description:
					'Name of a required field to add to the search. Even if not referenced or used directly by the search, a required field is still included in events and summary endpoints.',
			},
			{
				displayName: 'Search mode',
				name: 'search_mode',
				type: 'options',
				default: 'normal',
				options: [
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'Real time',
						value: 'realtime',
					},
				],
			},
			{
				displayName: 'Status buckets',
				name: 'status_buckets',
				type: 'number',
				default: 0,
				description:
					'The most status buckets to generate. Set <code>0</code> generate no timeline information.',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 86400,
				description: 'Number of seconds to keep this search after processing has stopped',
			},
			{
				displayName: 'Workload pool',
				name: 'workload_pool',
				type: 'string',
				default: '',
				description: 'New workload pool where the existing running search should be placed',
			},
		],
	},

	// ----------------------------------------
	//            searchJob: delete
	// ----------------------------------------
	{
		displayName: 'Search ID',
		name: 'searchJobId',
		description: 'ID of the search job to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//              searchJob: get
	// ----------------------------------------
	{
		displayName: 'Search ID',
		name: 'searchJobId',
		description: 'ID of the search job to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//            searchJob: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['searchJob'],
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
		},
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['searchJob'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Sort direction',
				name: 'sort_dir',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'asc',
					},
					{
						name: 'Descending',
						value: 'desc',
					},
				],
				default: 'asc',
			},
			{
				displayName: 'Sort key',
				name: 'sort_key',
				description: 'Key name to use for sorting',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sort mode',
				name: 'sort_mode',
				type: 'options',
				options: [
					{
						name: 'Automatic',
						value: 'auto',
						description:
							'If all field values are numeric, collate numerically. Otherwise, collate alphabetically.',
					},
					{
						name: 'Alphabetic',
						value: 'alpha',
						description: 'Collate alphabetically, case-insensitive',
					},
					{
						name: 'Alphabetic and case-sensitive',
						value: 'alpha_case',
						description: 'Collate alphabetically, case-sensitive',
					},
					{
						name: 'Numeric',
						value: 'num',
						description: 'Collate numerically',
					},
				],
				default: 'auto',
			},
		],
	},
];
