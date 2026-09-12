import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { type DataverseQuery } from '../GenericFunctions';
import { assertValidEntitySet, buildODataQs, executeRequest } from './shared';
import {
	buildOptionsCollection,
	commonEntitySetProperty,
	commonExpandOption,
	commonPartitionIdOption,
	commonReturnFullMetadataOption,
	commonSelectOption,
	forOperation,
} from './sharedProperties';
import type { OperationDefinition } from './types';

const DATAVERSE_MAX_PAGE_SIZE = 5_000;

/**
 * dv connector — "Get Many" rows (`ListRecords`).
 *
 * `GET /{entitySet}` with the full Dataverse OData query surface:
 * `$select`, `$filter`, `$orderby`, `$expand`, and `$top`, plus FetchXml,
 * partitionId, and Return Full Metadata.
 *
 * Two paging modes:
 *   - **Return All**: follows `@odata.nextLink` for OData queries until exhausted.
 *     FetchXML queries cannot use Return All.
 *   - **Limit**: stops after N rows (default 50). On the OData path, limits up to
 *     5,000 use `$top: N`; larger limits keep server-driven paging so Dataverse
 *     can return more than one page. FetchXML uses client-side capping only.
 */
export const getManyRows: OperationDefinition = {
	displayName: 'Get Many',
	value: 'getAll',
	description: 'Get many rows in a Microsoft Dataverse table',
	action: 'Get many rows',
	properties: [
		commonEntitySetProperty(['getAll']),
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: forOperation(['getAll']),
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: {
				show: { ...forOperation(['getAll']).show, returnAll: [false] },
			},
		},
		buildOptionsCollection('getAll', [
			commonExpandOption(),
			{
				displayName: 'FetchXML Query',
				name: 'fetchXml',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: '<fetch>...</fetch>',
				description:
					'Advanced query — forwarded as ?fetchXml=. Overrides OData query options when set. Cannot be used with Return All.',
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
					'Maximum number of rows Dataverse returns without paging. When unset, Limit is used here only when it is 5,000 or less.',
			},
			commonSelectOption(),
			{
				displayName: 'Sort Column Name or ID',
				name: 'orderbyColumn',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getReadColumns',
					loadOptionsDependsOn: ['entitySet.value'],
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
		const entitySet = assertValidEntitySet(ctx, i, ctx.getNodeParameter('entitySet', i));
		const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
		const limit = returnAll ? 0 : (ctx.getNodeParameter('limit', i, 50) as number);
		const options = ctx.getNodeParameter('getAllOptions', i, {}) as IDataObject;

		const orderbyColumn = (options.orderbyColumn as string) ?? '';
		const orderbyDirection = (options.orderbyDirection as string) ?? 'asc';
		const orderby = orderbyColumn
			? `${orderbyColumn} ${orderbyDirection}`
			: ((options.orderby as string) ?? '');

		const fetchXml = ((options.fetchXml as string) ?? '').trim();
		if (returnAll && fetchXml) {
			throw new NodeOperationError(
				ctx.getNode(),
				'FetchXML Query cannot be used with Return All because FetchXML pagination is not supported. Disable Return All and set a Limit instead.',
				{ itemIndex: i },
			);
		}
		const userTop = typeof options.top === 'number' && options.top > 0 ? options.top : undefined;
		// `$top` disables server-driven paging, so only derive it when the requested
		// limit fits within one standard Dataverse page. Explicit Row Count still
		// takes precedence, and FetchXML has no equivalent option.
		const limitTop = limit > 0 && limit <= DATAVERSE_MAX_PAGE_SIZE ? limit : undefined;
		const effectiveTop = userTop ?? limitTop;
		const qs: DataverseQuery = fetchXml
			? { fetchXml }
			: buildODataQs({
					select: options.select,
					filter: options.filter,
					orderby,
					expand: options.expand,
					top: effectiveTop,
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
