import type { IDataObject } from 'n8n-workflow';
import type { OperationDefinition } from './types';
import { type DataverseQuery } from '../GenericFunctions';
import { buildODataQs, executeRequest, normalizeEntitySet } from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonExpandOption,
	commonPartitionIdOption,
	commonReturnFullMetadataOption,
	commonSelectOption,
	forOperation,
} from './sharedProperties';

/**
 * dv connector — "List rows" (`ListRecords`).
 *
 * `GET /{entitySet}` with the full Dataverse OData query surface:
 * `$select`, `$filter`, `$orderby`, `$expand`, `$top`, `$skiptoken`,
 * plus FetchXml, partitionId, and Return Full Metadata.
 *
 * Two paging modes:
 *   - **Return All**: follows `@odata.nextLink` until exhausted.
 *   - **Limit**: stops after N rows (default 50). For one-shot `$top`
 *     semantics the user can either rely on this limit or set `$top`
 *     explicitly via Options → Row Count.
 */
export const listRows: OperationDefinition = {
	displayName: 'List Rows',
	value: 'list',
	description: 'List rows in a Microsoft Dataverse table',
	action: 'List rows',
	properties: [
		commonEntitySetProperty(['list']),
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: forOperation(['list']),
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: {
				show: { ...forOperation(['list']).show, returnAll: [false] },
			},
		},
		buildOptionsCollection('list', [
			commonExpandOption(),
			{
				displayName: 'FetchXML Query',
				name: 'fetchXml',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: '<fetch>...</fetch>',
				description:
					'Advanced query — forwarded as ?fetchXml=. Overrides OData query options when set.',
			},
			{
				displayName: 'Filter Rows',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'statecode eq 0',
				description: 'OData $filter expression',
			},
			commonPartitionIdOption(),
			commonReturnFullMetadataOption(),
			{
				displayName: 'Row Count ($Top)',
				name: 'top',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 0,
				description:
					'OData $top — server-side row cap (separate from the node-level Limit). 0 = unset.',
			},
			commonSelectOption(),
			{
				displayName: 'Skip Token',
				name: 'skiptoken',
				// Not a secret: an opaque OData continuation token. Masking it would
				// hurt UX (users paste/inspect/edit these). The lint rule only flags it
				// because the field name contains "token".
				// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
				type: 'string',
				default: '',
				description: 'Continuation token returned from a previous List Rows page',
			},
			{
				displayName: 'Sort Column Name or ID',
				name: 'orderbyColumn',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: ['entitySet'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Sort Direction',
				name: 'orderbyDirection',
				type: 'options',
				default: 'asc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				description: 'Direction for Sort Column. Ignored when Sort Column is empty.',
			},
			{
				displayName: 'Sort By Override',
				name: 'orderby',
				type: 'string',
				default: '',
				placeholder: 'createdon desc, name asc',
				description:
					'Raw OData $orderby expression. Used only when Sort Column is empty — lets you pass multi-column sort or expressions the picker does not cover.',
			},
		]),
	],
	async execute(ctx, i, credentialType) {
		const entitySet = normalizeEntitySet(ctx.getNodeParameter('entitySet', i));
		const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
		const limit = returnAll ? 0 : (ctx.getNodeParameter('limit', i, 50) as number);
		const options = ctx.getNodeParameter('listOptions', i, {}) as IDataObject;

		const orderbyColumn = (options.orderbyColumn as string) ?? '';
		const orderbyDirection = (options.orderbyDirection as string) ?? 'asc';
		const orderby = orderbyColumn
			? `${orderbyColumn} ${orderbyDirection}`
			: ((options.orderby as string) ?? '');

		const fetchXml = (options.fetchXml as string) ?? '';
		const qs: DataverseQuery = fetchXml
			? { fetchXml }
			: buildODataQs({
					select: options.select,
					filter: options.filter,
					orderby,
					expand: options.expand,
					top: typeof options.top === 'number' && options.top > 0 ? options.top : undefined,
					skiptoken: options.skiptoken,
				});

		return await executeRequest(ctx, credentialType, {
			method: 'GET',
			path: `/${entitySet}`,
			qs,
			options,
			paged: true,
			limit,
		});
	},
};
