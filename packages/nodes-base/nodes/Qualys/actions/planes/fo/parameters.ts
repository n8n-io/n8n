import type { INodeProperties } from 'n8n-workflow';

import { ID_WINDOWED_OPS, TRUNCATABLE_OPS, usingOptions } from '../../shared/operationScopes';
import { FO_ID_WINDOW_SIZE } from '../../resources';

/**
 * Platform API (qualysapi) parameters. This plane takes Qualys' documented named
 * parameters directly, so each operation gets its own Additional Fields
 * collection. The node-wide Options collection is for how output is shaped.
 */
const truncationProperty: INodeProperties = {
	displayName: 'Batch Size',
	name: 'truncationLimit',
	type: 'number',
	default: 1000,
	typeOptions: { minValue: 0, numberPrecision: 0 },
	description:
		'Records fetched per API call. 0 removes the limit, which Qualys advises against unless the request is narrowed by an ID or IP range.',
	displayOptions: { show: { operation: TRUNCATABLE_OPS } },
};

/**
 * The KnowledgeBase API takes no truncation limit: it answers with every QID
 * that matches, in one response, which in full detail is larger than Node can
 * hold in a single string. The pull is therefore split into windows of QID,
 * and this is how wide each one is.
 */
const idWindowProperty: INodeProperties = {
	displayName: 'Chunk Size (QIDs)',
	name: 'idWindowSize',
	type: 'number',
	default: FO_ID_WINDOW_SIZE,
	typeOptions: { minValue: 1, numberPrecision: 0 },
	description:
		'How many QIDs each request covers. The API returns everything in range at once, so a smaller chunk means more requests but smaller responses. Lower it if a request fails because the response was too large.',
	displayOptions: { show: { operation: ID_WINDOWED_OPS } },
};

const commonHostFilters: NonNullable<INodeProperties['options']> = [
	{
		displayName: 'Asset Group IDs',
		name: 'ag_ids',
		type: 'string',
		default: '',
		description: 'Comma-separated asset group IDs. Cannot be combined with asset group titles.',
	},
	{
		displayName: 'Asset Group Titles',
		name: 'ag_titles',
		type: 'string',
		default: '',
		description: 'Comma-separated asset group titles. Cannot be combined with asset group IDs.',
	},
	{
		displayName: 'Host IDs',
		name: 'ids',
		type: 'string',
		default: '',
		description: 'Comma-separated host IDs and ranges, for example 190-400',
	},
	{
		displayName: 'Maximum Host ID',
		name: 'id_max',
		type: 'string',
		default: '',
		description: 'Only hosts with an ID at or below this value',
	},
	{
		displayName: 'Minimum Host ID',
		name: 'id_min',
		type: 'string',
		default: '',
		description: 'Only hosts with an ID at or above this value',
	},
	{
		displayName: 'IP Addresses',
		name: 'ips',
		type: 'string',
		default: '',
		description: 'Comma-separated addresses and ranges, for example 10.0.0.1-10.0.0.100',
	},
	{
		displayName: 'Network IDs',
		name: 'network_ids',
		type: 'string',
		default: '',
		description: 'Comma-separated custom network IDs, when network support is enabled',
	},
	{
		displayName: 'Operating System Pattern',
		name: 'os_pattern',
		type: 'string',
		default: '',
		description: 'PCRE regular expression matched against the operating system name',
	},
	{
		displayName: 'Scanned Since',
		name: 'vm_scan_since',
		type: 'string',
		default: '',
		placeholder: '2026-01-31',
		description:
			'Hosts scanned and processed since this date. Cannot be combined with Scanned In Last Days.',
	},
	{
		displayName: 'Scanned In Last Days',
		name: 'max_days_since_last_vm_scan',
		type: 'string',
		default: '',
		description: 'Hosts scanned within this many days',
	},
	{
		displayName: 'Show Asset ID',
		name: 'show_asset_id',
		type: 'boolean',
		default: true,
		description: 'Whether to include the asset ID, which is the join key to IT Asset records',
	},
	{
		displayName: 'Show Tags',
		name: 'show_tags',
		type: 'boolean',
		default: false,
		description: 'Whether to include asset tags',
	},
];

const tagFilters: NonNullable<INodeProperties['options']> = [
	{
		displayName: 'Use Tags',
		name: 'use_tags',
		type: 'boolean',
		default: false,
		description: 'Whether to select hosts by tag instead of by IP address or asset group',
	},
	{
		displayName: 'Tag Set By',
		name: 'tag_set_by',
		type: 'options',
		default: 'id',
		options: [
			{ name: 'ID', value: 'id' },
			{ name: 'Name', value: 'name' },
		],
		description: 'Whether tags are identified by ID or by name',
	},
	{
		displayName: 'Tags to Include',
		name: 'tag_set_include',
		type: 'string',
		default: '',
		description: 'Comma-separated tags whose hosts are included',
	},
	{
		displayName: 'Tags to Exclude',
		name: 'tag_set_exclude',
		type: 'string',
		default: '',
		description: 'Comma-separated tags whose hosts are excluded',
	},
	{
		displayName: 'Include Selector',
		name: 'tag_include_selector',
		type: 'options',
		default: 'any',
		options: [
			{ name: 'Any', value: 'any' },
			{ name: 'All', value: 'all' },
		],
		description: 'Whether a host must match any or all of the included tags',
	},
	{
		displayName: 'Exclude Selector',
		name: 'tag_exclude_selector',
		type: 'options',
		default: 'any',
		options: [
			{ name: 'Any', value: 'any' },
			{ name: 'All', value: 'all' },
		],
		description: 'Whether a host must match any or all of the excluded tags',
	},
];

const extraParameters: NonNullable<INodeProperties['options']>[number] = {
	displayName: 'Extra Parameters',
	name: 'extraParameters',
	type: 'fixedCollection',
	default: {},
	typeOptions: { multipleValues: true },
	description: 'Any other documented API parameter, passed through verbatim',
	options: [
		{
			name: 'extraParameters',
			displayName: 'Parameter',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Parameter name as documented by Qualys',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Parameter value',
				},
			],
		},
	],
};

/**
 * Additional Fields collections bind to whichever operations name them in the endpoint
 * table, so moving an endpoint between resources cannot orphan its UI.
 */
const optionsCollection = (
	name: string,
	options: NonNullable<INodeProperties['options']>,
): INodeProperties => ({
	displayName: 'Additional Fields',
	name,
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: { show: { operation: usingOptions(name) } },
	options,
});

export const foProperties: INodeProperties[] = [
	truncationProperty,
	idWindowProperty,
	optionsCollection('hostOptions', [
		...commonHostFilters,
		{
			displayName: 'Detail Level',
			name: 'details',
			type: 'options',
			default: 'Basic',
			options: [
				{ name: 'All', value: 'All' },
				{ name: 'All With Asset Groups', value: 'All/AGs' },
				{ name: 'Basic', value: 'Basic' },
				{ name: 'Basic With Asset Groups', value: 'Basic/AGs' },
				{ name: 'None', value: 'None' },
			],
			description: 'How much host information to return',
		},
		{
			displayName: 'Show TruRisk',
			name: 'show_trurisk',
			type: 'boolean',
			default: false,
			description: 'Whether to include the TruRisk score, 0 to 1000',
		},
		{
			displayName: 'Show TruRisk Factors',
			name: 'show_trurisk_factors',
			type: 'boolean',
			default: false,
			description: 'Whether to include the TruRisk contributing factors',
		},
		{
			displayName: 'Minimum TruRisk',
			name: 'trurisk_min',
			type: 'string',
			default: '',
			description: 'Only assets at or above this TruRisk score. Requires Show TruRisk.',
		},
		{
			displayName: 'Maximum TruRisk',
			name: 'trurisk_max',
			type: 'string',
			default: '',
			description: 'Only assets at or below this TruRisk score. Requires Show TruRisk.',
		},
		{
			displayName: 'Show Cloud Metadata',
			name: 'host_metadata',
			type: 'options',
			default: 'all',
			options: [
				{ name: 'All', value: 'all' },
				{ name: 'AWS EC2', value: 'ec2' },
				{ name: 'Azure', value: 'azure' },
				{ name: 'Google', value: 'google' },
			],
			description: 'Include cloud provider metadata. Does not change which assets are returned.',
		},
		...tagFilters,
		extraParameters,
	]),
	optionsCollection('detectionOptions', [
		...commonHostFilters,
		{
			displayName: 'QIDs',
			name: 'qids',
			type: 'string',
			default: '',
			description: 'Comma-separated QIDs and ranges, for example 68518-68522',
		},
		{
			displayName: 'Severities',
			name: 'severities',
			type: 'string',
			default: '',
			description: 'Comma-separated severity levels or ranges, for example 3-5',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'string',
			default: '',
			placeholder: 'New,Active,Re-Opened,Fixed',
			description:
				'Detection statuses to include. Defaults to New, Active and Re-Opened; Fixed must be requested explicitly.',
		},
		{
			displayName: 'Vulnerability Type',
			name: 'include_vuln_type',
			type: 'options',
			default: 'confirmed',
			options: [
				{ name: 'Confirmed', value: 'confirmed' },
				{ name: 'Potential', value: 'potential' },
			],
			description: 'Restrict to confirmed or potential vulnerabilities',
		},
		{
			displayName: 'Detections Updated Since',
			name: 'detection_updated_since',
			type: 'string',
			default: '',
			placeholder: '2026-01-31',
			description:
				'Only detections whose status changed on or after this date. The natural key for incremental syncs.',
		},
		{
			displayName: 'Detections Updated Before',
			name: 'detection_updated_before',
			type: 'string',
			default: '',
			description: 'Only detections whose status changed before this date',
		},
		{
			displayName: 'Show QDS',
			name: 'show_qds',
			type: 'boolean',
			default: true,
			description: 'Whether to include the Qualys Detection Score',
		},
		{
			displayName: 'Show QDS Factors',
			name: 'show_qds_factors',
			type: 'boolean',
			default: false,
			description: 'Whether to include the QDS contributing factors',
		},
		{
			displayName: 'Minimum QDS',
			name: 'qds_min',
			type: 'string',
			default: '',
			description: 'Only detections at or above this QDS. Requires Show QDS.',
		},
		{
			displayName: 'Maximum QDS',
			name: 'qds_max',
			type: 'string',
			default: '',
			description: 'Only detections at or below this QDS. Requires Show QDS.',
		},
		{
			displayName: 'Show Results',
			name: 'show_results',
			type: 'boolean',
			default: true,
			description: 'Whether to include the detection evidence, which can be very large',
		},
		{
			displayName: 'Show Reopened Info',
			name: 'show_reopened_info',
			type: 'boolean',
			default: false,
			description: 'Whether to include first and last reopened dates',
		},
		{
			displayName: 'Show Information Gathered',
			name: 'show_igs',
			type: 'boolean',
			default: false,
			description: 'Whether to include information gathered findings alongside vulnerabilities',
		},
		{
			displayName: 'Include Ignored',
			name: 'include_ignored',
			type: 'boolean',
			default: false,
			description: 'Whether to include QIDs marked as ignored',
		},
		{
			displayName: 'Include Disabled',
			name: 'include_disabled',
			type: 'boolean',
			default: false,
			description: 'Whether to include QIDs marked as disabled',
		},
		{
			displayName: 'Filter Superseded QIDs',
			name: 'filter_superseded_qids',
			type: 'boolean',
			default: false,
			description: 'Whether to drop QIDs that have been superseded by another QID',
		},
		...tagFilters,
		extraParameters,
	]),
	optionsCollection('knowledgeBaseOptions', [
		{
			displayName: 'QIDs',
			name: 'ids',
			type: 'string',
			default: '',
			description:
				'Comma-separated QIDs and ranges. Sent as one request; without it the KnowledgeBase is walked in QID chunks.',
		},
		{
			displayName: 'Minimum QID',
			name: 'id_min',
			type: 'string',
			default: '',
			description: 'Only QIDs at or above this value. Bounds where the chunked walk starts.',
		},
		{
			displayName: 'Maximum QID',
			name: 'id_max',
			type: 'string',
			default: '',
			description: 'Only QIDs at or below this value. Bounds where the chunked walk stops.',
		},
		{
			displayName: 'Detail Level',
			name: 'details',
			type: 'options',
			default: 'Basic',
			options: [
				{ name: 'Basic', value: 'Basic' },
				{ name: 'All', value: 'All' },
			],
			description: 'How much vulnerability detail to return',
		},
		{
			displayName: 'CVE ID',
			name: 'cve',
			type: 'string',
			default: '',
			placeholder: 'CVE-2021-44228',
			description: 'Only vulnerabilities associated with this CVE',
		},
		{
			displayName: 'Patchable Only',
			name: 'is_patchable',
			type: 'boolean',
			default: false,
			description: 'Whether to return only vulnerabilities that have a patch',
		},
		{
			displayName: 'Modified After',
			name: 'last_modified_by_service_after',
			type: 'string',
			default: '',
			placeholder: '2026-01-31',
			description: 'Only QIDs modified by the service after this date',
		},
		{
			displayName: 'Discovery Method',
			name: 'discovery_method',
			type: 'string',
			default: '',
			placeholder: 'RemoteAndAuthenticated',
			description: 'Restrict to a discovery method',
		},
		extraParameters,
	]),
	{
		displayName: 'CVE IDs',
		name: 'cve',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'CVE-2021-44228',
		description: 'Comma-separated CVE IDs to score',
		displayOptions: { show: { operation: ['listCveScores'] } },
	},
	optionsCollection('cveScoreOptions', [
		{
			displayName: 'Detail Level',
			name: 'details',
			type: 'options',
			default: 'Basic',
			options: [
				{ name: 'Basic', value: 'Basic' },
				{ name: 'All', value: 'All' },
			],
			description: 'Basic returns the score; All adds the contributing factors',
		},
		{
			displayName: 'Modified After',
			name: 'qvs_last_modified_after',
			type: 'string',
			default: '',
			description: 'Only scores changed after this date',
		},
		{
			displayName: 'Modified Before',
			name: 'qvs_last_modified_before',
			type: 'string',
			default: '',
			description: 'Only scores changed before this date',
		},
		extraParameters,
	]),
	optionsCollection('assetGroupOptions', [
		{
			displayName: 'Group IDs',
			name: 'ids',
			type: 'string',
			default: '',
			description: 'Comma-separated asset group IDs and ranges',
		},
		{
			displayName: 'Group Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Return only the group with this exact title',
		},
		{
			displayName: 'Network IDs',
			name: 'network_ids',
			type: 'string',
			default: '',
			description: 'Comma-separated custom network IDs',
		},
		{
			displayName: 'Show Attributes',
			name: 'show_attributes',
			type: 'string',
			default: 'ALL',
			description: 'Comma-separated attributes to include, or ALL',
		},
		extraParameters,
	]),
	optionsCollection('ipOptions', [
		{
			displayName: 'IP Addresses',
			name: 'ips',
			type: 'string',
			default: '',
			description: 'Comma-separated addresses and ranges to report on',
		},
		{
			displayName: 'Tracking Method',
			name: 'tracking_method',
			type: 'options',
			default: 'IP',
			options: [
				{ name: 'IP', value: 'IP' },
				{ name: 'DNS', value: 'DNS' },
				{ name: 'NETBIOS', value: 'NETBIOS' },
			],
			description: 'Restrict to hosts using this tracking method',
		},
		{
			displayName: 'Compliance Enabled',
			name: 'compliance_enabled',
			type: 'boolean',
			default: false,
			description: 'Whether to return only hosts assigned to policy compliance',
		},
		extraParameters,
	]),
	optionsCollection('scanOptions', [
		{
			displayName: 'Scan Reference',
			name: 'scan_ref',
			type: 'string',
			default: '',
			placeholder: 'scan/1234567890.12345',
			description: 'Return only this scan',
		},
		{
			displayName: 'State',
			name: 'state',
			type: 'string',
			default: '',
			placeholder: 'Finished,Running',
			description: 'Comma-separated scan states',
		},
		{
			displayName: 'Processed',
			name: 'processed',
			type: 'boolean',
			default: false,
			description: 'Whether to return only scans whose results have been processed',
		},
		{
			displayName: 'Launched After',
			name: 'launched_after_datetime',
			type: 'string',
			default: '',
			placeholder: '2026-01-31',
			description: 'Only scans launched on or after this date',
		},
		{
			displayName: 'Launched Before',
			name: 'launched_before_datetime',
			type: 'string',
			default: '',
			description: 'Only scans launched before this date',
		},
		{
			displayName: 'Scan Type',
			name: 'type',
			type: 'options',
			default: 'On-Demand',
			options: [
				{ name: 'On-Demand', value: 'On-Demand' },
				{ name: 'Scheduled', value: 'Scheduled' },
				{ name: 'API', value: 'API' },
			],
			description: 'How the scan was started',
		},
		{
			displayName: 'Target',
			name: 'target',
			type: 'string',
			default: '',
			description: 'Only scans covering these addresses',
		},
		{
			displayName: 'Show Options',
			name: 'show_op',
			type: 'boolean',
			default: false,
			description: 'Whether to include the option profile settings used by each scan',
		},
		extraParameters,
	]),
	optionsCollection('reportOptions', [
		{
			displayName: 'Report ID',
			name: 'id',
			type: 'string',
			default: '',
			description: 'Return only this report',
		},
		{
			displayName: 'State',
			name: 'state',
			type: 'string',
			default: '',
			placeholder: 'Finished',
			description: 'Comma-separated report states',
		},
		{
			displayName: 'User Login',
			name: 'user_login',
			type: 'string',
			default: '',
			description: 'Only reports created by this user',
		},
		{
			displayName: 'Expires Before',
			name: 'expires_before_datetime',
			type: 'string',
			default: '',
			description: 'Only reports expiring before this date',
		},
		extraParameters,
	]),
	optionsCollection('searchListOptions', [
		{
			displayName: 'List IDs',
			name: 'ids',
			type: 'string',
			default: '',
			description: 'Comma-separated search list IDs and ranges',
		},
		extraParameters,
	]),
];
