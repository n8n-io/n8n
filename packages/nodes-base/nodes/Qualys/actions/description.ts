import type { INodeProperties } from 'n8n-workflow';

import { LIST_OPS } from './shared/operationScopes';
import { csamProperties } from './planes/csam/parameters';
import { otFilterProperties } from './planes/ot/parameters';
import { foProperties } from './planes/fo/parameters';
import { RESOURCES } from './resources';

/** n8n's linter wants dropdown entries in alphabetical order. */
const byName = <T extends { name: string }>(entries: T[]): T[] =>
	[...entries].sort((a, b) => a.name.localeCompare(b.name));

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: byName(
		Object.entries(RESOURCES).map(([value, definition]) => ({
			name: definition.name,
			value,
			description: definition.description,
		})),
	),
	default: 'itAsset',
};

/**
 * One dropdown per resource, naming the records that resource can read.
 *
 * Each defaults to the first operation its table declares. A test asserts every
 * dropdown defaults to an operation it actually offers - a stronger check than
 * `node-param-default-missing` can perform, since that rule reads defaults out
 * of the syntax tree and cannot evaluate one computed per resource.
 */
const operationProperties: INodeProperties[] = Object.entries(RESOURCES).map(
	([resource, definition]) => {
		const [firstOperation] = Object.keys(definition.operations);

		return {
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: byName(
				Object.entries(definition.operations).map(([value, operation]) => ({
					name: operation.name,
					value,
					description: operation.description,
					action: operation.action,
				})),
			),
			default: firstOperation,
			displayOptions: { show: { resource: [resource] } },
		};
	},
);

// ------------------------------------------------------------ shared paging UI

const pagingProperties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { operation: LIST_OPS } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { operation: LIST_OPS, returnAll: [false] } },
	},
];

// ------------------------------------------------------------------- output

const outputProperties: INodeProperties[] = [
	{
		displayName: 'Item Granularity',
		name: 'itemGranularity',
		type: 'options',
		default: 'detection',
		options: [
			{
				name: 'Detection',
				value: 'detection',
				description: 'One item per detection, flattened with its host context',
			},
			{ name: 'Host', value: 'host', description: 'One item per host, with detections nested' },
		],
		description: 'How detections are split into items',
		displayOptions: { show: { operation: ['listDetections'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: LIST_OPS } },
		options: [
			{
				displayName: 'Add Response Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to attach a _qualys object carrying endpoint, paging and rate limit details. Ignored when Output Mode is Raw Response.',
			},
			{
				displayName: 'Output Mode',
				name: 'outputMode',
				type: 'options',
				options: [
					{ name: 'Items', value: 'items', description: 'One item per record' },
					{
						name: 'Raw Response',
						value: 'raw',
						description: 'A single item holding every page verbatim',
					},
				],
				default: 'items',
				description: 'How the response is emitted',
			},
		],
	},
];

const listProperties: INodeProperties[] = [
	...pagingProperties,
	...otFilterProperties,
	...csamProperties,
	...foProperties,
	...outputProperties,
];

/** Every parameter the node shows, in panel order. */
export const properties: INodeProperties[] = [
	resourceProperty,
	...operationProperties,
	...listProperties,
];
