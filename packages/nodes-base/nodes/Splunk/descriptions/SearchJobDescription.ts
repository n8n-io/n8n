import {
	INodeProperties,
} from 'n8n-workflow';

export const searchJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a search job',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a search job',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search job',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all search jobs',
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
		description: 'Search language string to execute, in Splunk\'s <a href="https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual">Search Processing Language</a>',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
				operation: [
					'create',
				],
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
				resource: [
					'searchJob',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Ad Hoc Search Level',
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
				displayName: 'Auto Cancel',
				name: 'auto_cancel',
				type: 'number',
				default: 0,
				description: 'Seconds after which the search job automatically cancels',
			},
			{
				displayName: 'Auto Finalize on Events Completion',
				name: 'auto_finalize_ec',
				type: 'number',
				default: 0,
				description: 'Auto-finalize the search after at least this many events are processed',
			},
			{
				displayName: 'Auto Pause',
				name: 'auto_pause',
				type: 'number',
				default: 0,
				description: 'Seconds of inactivity after which the search job automatically pauses',
			},
			{
				displayName: 'Earliest Time',
				name: 'earliest_time',
				type: 'dateTime',
				default: '',
				description: 'The earliest (inclusive), respectively, time bounds for the search',
			},
			{
				displayName: 'Exec Mode',
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
						name: 'One Shot',
						value: 'oneshot',
					},
				],
			},
			{
				displayName: 'Index Earliest',
				name: 'index_earliest',
				type: 'dateTime',
				default: '',
				description: 'The earliest (inclusive), respectively, time bounds for the search, based on the index time bounds',
			},
			{
				displayName: 'Index Latest',
				name: 'index_latest',
				type: 'dateTime',
				default: '',
				description: 'Sets the latest (exclusive), respectively, time bounds for the search, based on the index time bounds',
			},
			{
				displayName: 'Indexed Real Time Offset',
				name: 'indexedRealtimeOffset',
				type: 'number',
				default: 0,
				description: 'Seconds of disk sync delay for indexed real-time search',
			},
			{
				displayName: 'Latest Time',
				name: 'latest_time',
				type: 'dateTime',
				default: '',
				description: 'The latest (exclusive), respectively, time bounds for the search',
			},
			{
				displayName: 'Max Time',
				name: 'max_time',
				type: 'number',
				default: 0,
				description: 'Number of seconds to run this search before finalizing. Enter <code>0</code> to never finalize.',
			},
			{
				displayName: 'Namespace',
				name: 'namespace',
				type: 'string',
				default: '',
				description: 'Application namespace in which to restrict searches',
			},
			{
				displayName: 'Reduce Frequency',
				name: 'reduce_freq',
				type: 'number',
				default: 0,
				description: 'How frequently to run the MapReduce reduce phase on accumulated map values',
			},
			{
				displayName: 'Remote Server List',
				name: 'remote_server_list',
				type: 'string',
				default: '',
				description: 'Comma-separated list of (possibly wildcarded) servers from which raw events should be pulled. This same server list is to be used in subsearches.',
			},
			{
				displayName: 'Reuse Max Seconds Ago',
				name: 'reuse_max_seconds_ago',
				type: 'number',
				default: 0,
				description: 'Number of seconds ago to check when an identical search is started and return the job\’s search ID instead of starting a new job',
			},
			{
				displayName: 'Required Field',
				name: 'rf',
				type: 'string',
				default: '',
				description: 'Required field to add to the search',
			},
			{
				displayName: 'Search Mode',
				name: 'search_mode',
				type: 'options',
				default: 'normal',
				options: [
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'Real Time',
						value: 'realtime',
					},
				],
			},
			{
				displayName: 'Status Buckets',
				name: 'status_buckets',
				type: 'number',
				default: 0,
				description: 'The most status buckets to generate. Set <code>0</code> generate no timeline information.',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 0,
				description: 'Number of seconds to keep this search after processing has stopped',
			},
			{
				displayName: 'Workload Pool',
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
		description: 'ID of the search job to delete, available after the final slash in the <code>id</code> field in API responses',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              searchJob: get
	// ----------------------------------------
	{
		displayName: 'Search ID',
		name: 'searchJobId',
		description: 'ID of the search job to retrieve, available after the final slash in the <code>id</code> field in API responses',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            searchJob: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'searchJob',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'searchJob',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Sort Direction',
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
				displayName: 'Sort Key',
				name: 'sort_key',
				description: 'Key name to use for sorting',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sort Mode',
				name: 'sort_mode',
				type: 'options',
				options: [
					{
						name: 'Automatic',
						value: 'auto',
						description: 'If all field values are numeric, collate numerically. Otherwise, collate alphabetically.',
					},
					{
						name: 'Alphabetic',
						value: 'alpha',
						description: 'Collate alphabetically, case-insensitive',
					},
					{
						name: 'Alphabetic and Case-Sensitive',
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
