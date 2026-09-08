import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { populate, toUnixEpoch } from '../../helpers/utils';
import { splunkApiJsonRequest, splunkApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'search',
		description:
			'Search language string to execute, in Splunk\'s <a href="https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual">Search Processing Language</a>',
		placeholder: 'e.g. search index=_internal | stats count by source',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
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
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs

	const body = {
		search: this.getNodeParameter('search', i),
	} as IDataObject;

	const { earliest_time, latest_time, index_earliest, index_latest, ...rest } =
		this.getNodeParameter('additionalFields', i) as IDataObject & {
			earliest_time?: string;
			latest_time?: string;
			index_earliest?: string;
			index_latest?: string;
		};

	populate(
		{
			...(earliest_time && { earliest_time: toUnixEpoch(earliest_time) }),
			...(latest_time && { latest_time: toUnixEpoch(latest_time) }),
			...(index_earliest && { index_earliest: toUnixEpoch(index_earliest) }),
			...(index_latest && { index_latest: toUnixEpoch(index_latest) }),
			...rest,
		},
		body,
	);

	const endpoint = '/services/search/jobs';
	const responseData = await splunkApiRequest.call(this, 'POST', endpoint, body);

	const getEndpoint = `/services/search/jobs/${responseData.response.sid}`;
	const returnData = await splunkApiJsonRequest.call(this, 'GET', getEndpoint);
	return returnData;
}
