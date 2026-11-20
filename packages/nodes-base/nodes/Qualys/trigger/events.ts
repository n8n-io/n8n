/**
 * What the trigger can watch.
 *
 * Every event is an existing VMDR list operation plus the Qualys parameter that
 * narrows it to "changed since". The endpoint and the record path are read from
 * the operation table rather than repeated here, so a trigger cannot drift from
 * the node it mirrors.
 *
 * Only endpoints with such a parameter can be polled. Without one, each poll
 * would re-read the whole collection and the node would have to diff it, which
 * is a different thing from a trigger and belongs in a workflow.
 */
import type { INodeProperties } from 'n8n-workflow';

import { OPERATIONS, type Operation } from '../actions/resources';

export type TriggerEvent = {
	/** Menu entry. */
	name: string;
	/** Shown in n8n's node panel, under the Qualys node's Triggers tab. */
	action: string;
	description: string;
	/** The list operation this event reads, by name in the operation table. */
	operation: string;
	/** The Qualys parameter carrying the high-water mark. */
	since: string;
	/** Parameters sent on every poll, unless the user overrides them. */
	defaults?: Record<string, string>;
};

export const TRIGGER_EVENTS: Record<string, TriggerEvent> = {
	detectionUpdated: {
		name: 'Detection Updated',
		action: 'On a detection changing',
		description:
			'A vulnerability detection was found, reopened, fixed or otherwise changed status on a host',
		operation: 'listDetections',
		since: 'detection_updated_since',
		// Without this the API answers New, Active and Re-Opened only, so a
		// detection going Fixed - the event a remediation workflow waits for -
		// would never arrive.
		defaults: { status: 'New,Active,Re-Opened,Fixed' },
	},
	hostScanned: {
		name: 'Host Scanned',
		action: 'On a host being scanned',
		description: 'A host was scanned and its results processed',
		operation: 'listHosts',
		since: 'vm_scan_since',
	},
	knowledgeBaseUpdated: {
		name: 'KnowledgeBase Updated',
		action: 'On a QID being published or revised',
		description: 'Qualys published or revised a QID',
		operation: 'listKnowledgeBase',
		since: 'last_modified_after',
	},
	scanLaunched: {
		name: 'Scan Launched',
		action: 'On a scan starting',
		description: 'A scan started, whether on demand, scheduled or through the API',
		operation: 'listScans',
		since: 'launched_after_datetime',
	},
};

/** The operation an event reads, with its endpoint and record path. */
export function operationFor(event: TriggerEvent): Operation {
	return OPERATIONS[event.operation];
}

const eventProperty: INodeProperties = {
	displayName: 'Event',
	name: 'event',
	type: 'options',
	noDataExpression: true,
	default: 'detectionUpdated',
	description: 'Which change to watch for',
	options: Object.entries(TRIGGER_EVENTS)
		.map(([value, event]) => ({
			name: event.name,
			value,
			description: event.description,
			action: event.action,
		}))
		.sort((a, b) => a.name.localeCompare(b.name)),
};

export const triggerProperties: INodeProperties[] = [
	eventProperty,
	{
		displayName: 'Item Granularity',
		name: 'itemGranularity',
		type: 'options',
		default: 'detection',
		description: 'Whether to emit one item per detection or one per host',
		options: [
			{
				name: 'Detection',
				value: 'detection',
				description: 'One item per detection, host context flattened in',
			},
			{ name: 'Host', value: 'host', description: 'One item per host, with its detections nested' },
		],
		displayOptions: { show: { event: ['detectionUpdated'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Asset Group IDs',
				name: 'ag_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated asset group IDs to watch',
			},
			{
				displayName: 'Batch Size',
				name: 'truncationLimit',
				type: 'number',
				default: 1000,
				typeOptions: { minValue: 0, numberPrecision: 0 },
				description:
					'Records fetched per API call. Polls follow the next-batch URL until the interval is covered.',
			},
			{
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
			},
			{
				displayName: 'First Poll Covers (Minutes)',
				name: 'lookbackMinutes',
				type: 'number',
				default: 60,
				typeOptions: { minValue: 0, numberPrecision: 0 },
				description:
					'How far back the first poll reaches. Later polls start where the previous one ended. Set to 0 to emit nothing that happened before the workflow was activated.',
			},
			{
				displayName: 'IP Addresses',
				name: 'ips',
				type: 'string',
				default: '',
				description: 'Comma-separated addresses and ranges to watch',
			},
			{
				displayName: 'Max Records Per Poll',
				name: 'maxRecords',
				type: 'number',
				default: 1000,
				typeOptions: { minValue: 0, numberPrecision: 0 },
				description:
					'Caps a single poll, so a long backlog cannot flood the workflow. 0 fetches everything the interval turned up. A backlog is not skipped: the next poll resumes where this one stopped, and the high-water mark only moves once the window has drained. Records arrive in whole batches, so a poll can overshoot by up to one Batch Size.',
			},
			{
				displayName: 'QIDs',
				name: 'qids',
				type: 'string',
				default: '',
				description: 'Comma-separated QIDs and ranges to watch',
			},
			{
				displayName: 'Severities',
				name: 'severities',
				type: 'string',
				default: '',
				description: 'Comma-separated severity levels or ranges, for example 4-5',
			},
		],
	},
];
