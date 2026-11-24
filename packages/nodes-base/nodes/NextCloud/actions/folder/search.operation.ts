import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, tryToParseDateTime } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { escapeDavLikeValue } from '@utils/query-escaping';
import { updateDisplayOptions } from '@utils/utilities';

import {
	RESOURCETYPE_PROPFIND_BODY,
	nextCloudApiRequest,
	readMultistatus,
	readProps,
	searchCondition,
	searchFiles,
	webDavPath,
} from '../../GenericFunctions';

const properties: INodeProperties[] = [
	{
		displayName: 'Search Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. invoice',
		description:
			'Text that the name contains. The match ignores case. Leave empty to match every name.',
	},
	{
		displayName: 'Folder',
		name: 'path',
		type: 'string',
		default: '/',
		placeholder: 'e.g. /invoices/2019',
		description: 'The path of the folder to search in. The search includes all its subfolders.',
	},
	...returnAllOrLimit,
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'e.g. application/pdf',
				description:
					'Return only files of this type. End with "/*" to match a group, like "image/*".',
			},
			{
				displayName: 'Modified After',
				name: 'modifiedAfter',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Modified Before',
				name: 'modifiedBefore',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Uploaded After',
				name: 'uploadedAfter',
				type: 'dateTime',
				default: '',
				description: 'Needs Nextcloud 32.0.7, 33.0.1, 34 or later',
			},
			{
				displayName: 'What to Search',
				name: 'whatToSearch',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Files and Folders',
						value: 'all',
					},
					{
						name: 'Files',
						value: 'files',
					},
					{
						name: 'Folders',
						value: 'folders',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Exact Name',
				name: 'exactName',
				type: 'boolean',
				default: false,
				description: 'Whether the whole name must match, instead of a part of it',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const RETURN_ALL_LIMIT = 10000;

interface Filter {
	mimeType?: string;
	modifiedAfter?: string;
	modifiedBefore?: string;
	uploadedAfter?: string;
	whatToSearch?: 'all' | 'files' | 'folders';
}

// Nextcloud reads unix seconds or an ATOM date without fractions. It turns any other form into 0,
// which makes an "after" filter match everything, so the node always sends unix seconds.
function unixSeconds(this: IExecuteFunctions, field: string, value: string, i: number) {
	try {
		return Math.floor(tryToParseDateTime(value, this.getTimezone()).toSeconds());
	} catch {
		throw new NodeOperationError(this.getNode(), `"${field}" is not a valid date: "${value}"`, {
			itemIndex: i,
		});
	}
}

// XML cannot hold these characters, so Nextcloud would reject the whole request with HTTP 400
function hasControlCharacter(value: string) {
	return [...value].some(
		(char) => char.charCodeAt(0) < 0x20 && char !== '\t' && char !== '\n' && char !== '\r',
	);
}

function whereClause(
	this: IExecuteFunctions,
	query: string,
	exactName: boolean,
	filter: Filter,
	i: number,
) {
	const mimeType = filter.mimeType?.trim();
	const invalid = (
		[
			['Search Query', query],
			['MIME Type', mimeType ?? ''],
		] as const
	).find(([, value]) => hasControlCharacter(value));
	if (invalid) {
		throw new NodeOperationError(this.getNode(), `"${invalid[0]}" contains a control character`, {
			itemIndex: i,
			description:
				'Nextcloud names and file types cannot contain control characters. Remove them from the value.',
		});
	}

	const name =
		query === '' ? '%' : exactName ? escapeDavLikeValue(query) : `%${escapeDavLikeValue(query)}%`;
	const conditions = [searchCondition('like', 'd:displayname', name)];

	if (filter.whatToSearch === 'folders') conditions.push('<d:is-collection/>');
	if (filter.whatToSearch === 'files') conditions.push('<d:not><d:is-collection/></d:not>');

	// Nextcloud takes a MIME pattern only as "type/%"
	if (mimeType?.endsWith('/*')) {
		conditions.push(searchCondition('like', 'd:getcontenttype', `${mimeType.slice(0, -1)}%`));
	} else if (mimeType) {
		conditions.push(searchCondition('eq', 'd:getcontenttype', mimeType));
	}

	const dates = [
		['Modified After', filter.modifiedAfter, 'gt', 'd:getlastmodified'],
		['Modified Before', filter.modifiedBefore, 'lt', 'd:getlastmodified'],
		['Uploaded After', filter.uploadedAfter, 'gt', 'nc:upload_time'],
	] as const;
	conditions.push(
		...dates
			.filter(([, value]) => value)
			.map(([field, value, operator, prop]) =>
				searchCondition(operator, prop, unixSeconds.call(this, field, String(value), i)),
			),
	);

	return conditions.length === 1 ? conditions[0] : `<d:and>${conditions.join('')}</d:and>`;
}

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const query = this.getNodeParameter('query', i, '') as string;
	const segments = (this.getNodeParameter('path', i, '/') as string).split('/').filter(Boolean);
	const folder = `/${segments.join('/')}`;
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = returnAll ? RETURN_ALL_LIMIT : Number(this.getNodeParameter('limit', i, 100));
	if (!Number.isInteger(limit) || limit < 1) {
		throw new NodeOperationError(this.getNode(), '"Limit" must be a whole number of 1 or more', {
			itemIndex: i,
		});
	}
	const filter = this.getNodeParameter('filter', i, {}) as Filter;
	const options = this.getNodeParameter('options', i, {}) as { exactName?: boolean };
	const where = whereClause.call(this, query, options.exactName === true, filter, i);

	// Nextcloud answers a file scope with a bare HTTP 500, so check the scope first
	if (segments.length > 0) {
		const [scope] = await readMultistatus(
			await nextCloudApiRequest.call(
				this,
				'PROPFIND',
				webDavPath(folder),
				RESOURCETYPE_PROPFIND_BODY,
				{
					'Content-Type': 'application/xml',
					Depth: '0',
				},
			),
		);
		if (readProps(scope)['d:resourcetype'] === '') {
			throw new NodeOperationError(this.getNode(), `"${folder}" is a file, not a folder`, {
				itemIndex: i,
				description:
					'Search works only in a folder. Set "Folder" to the folder that holds the file.',
			});
		}
	}

	// The SQL limit also counts the searched folder, which Nextcloud then drops, so ask for one more
	const items = await searchFiles.call(this, segments, where, limit + 1);

	if (returnAll && items.length >= RETURN_ALL_LIMIT) {
		this.addExecutionHints({
			message: `The search stopped at ${RETURN_ALL_LIMIT} results. Narrow the search to get the rest.`,
			location: 'outputPane',
		});
	}

	return items.slice(0, limit);
}
