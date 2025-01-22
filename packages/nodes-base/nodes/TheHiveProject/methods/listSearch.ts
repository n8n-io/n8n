import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { theHiveApiRequest } from '../transport';

async function listResource(
	this: ILoadOptionsFunctions,
	resource: string,
	filterField: string,
	nameField: string,
	urlPlaceholder: string | undefined,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: IDataObject[] = [
		{
			_name: resource,
		},
	];

	if (filter) {
		query.push({
			_name: 'filter',
			_like: {
				_field: filterField,
				_value: filter,
			},
		});
	}

	const from = paginationToken !== undefined ? parseInt(paginationToken, 10) : 0;
	const to = from + 100;
	query.push({
		_name: 'page',
		from,
		to,
	});

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

	if (response.length === 0) {
		return {
			results: [],
			paginationToken: undefined,
		};
	}

	const credentials = await this.getCredentials('theHiveProjectApi');
	const url = credentials?.url as string;

	return {
		results: response.map((entry: IDataObject) => ({
			name: entry[nameField],
			value: entry._id,
			url:
				urlPlaceholder !== undefined ? `${url}/${urlPlaceholder}/${entry._id}/details` : undefined,
		})),
		paginationToken: to,
	};
}

export async function caseSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await listResource.call(
		this,
		'listCase',
		'title',
		'title',
		'cases',
		filter,
		paginationToken,
	);
}

export async function commentSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await listResource.call(
		this,
		'listComment',
		'message',
		'message',
		undefined,
		filter,
		paginationToken,
	);
}

export async function alertSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await listResource.call(
		this,
		'listAlert',
		'title',
		'title',
		'alerts',
		filter,
		paginationToken,
	);
}

export async function taskSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await listResource.call(
		this,
		'listTask',
		'title',
		'title',
		undefined,
		filter,
		paginationToken,
	);
}

export async function pageSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let caseId;

	try {
		caseId = this.getNodeParameter('caseId', '', { extractValue: true }) as string;
	} catch (error) {
		caseId = undefined;
	}

	let query: IDataObject[];

	if (caseId) {
		query = [
			{
				_name: 'getCase',
				idOrName: caseId,
			},
			{
				_name: 'pages',
			},
		];
	} else {
		query = [
			{
				_name: 'listOrganisationPage',
			},
		];
	}

	if (filter) {
		query.push({
			_name: 'filter',
			_like: {
				_field: 'title',
				_value: filter,
			},
		});
	}

	const from = paginationToken !== undefined ? parseInt(paginationToken, 10) : 0;
	const to = from + 100;
	query.push({
		_name: 'page',
		from,
		to,
	});

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

	if (response.length === 0) {
		return {
			results: [],
			paginationToken: undefined,
		};
	}

	return {
		results: response.map((entry: IDataObject) => ({
			name: entry.title,
			value: entry._id,
		})),
		paginationToken: to,
	};
}

export async function logSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await listResource.call(
		this,
		'listLog',
		'message',
		'message',
		undefined,
		filter,
		paginationToken,
	);
}

export async function observableSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: IDataObject[] = [
		{
			_name: 'listObservable',
		},
	];

	if (filter) {
		query.push({
			_name: 'filter',
			_or: [
				{
					_like: {
						_field: 'data',
						_value: filter,
					},
				},
				{
					_like: {
						_field: 'message',
						_value: filter,
					},
				},
				{
					_like: {
						_field: 'attachment.name',
						_value: filter,
					},
				},
			],
		});
	}

	const from = paginationToken !== undefined ? parseInt(paginationToken, 10) : 0;
	const to = from + 100;
	query.push({
		_name: 'page',
		from,
		to,
	});

	const response = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

	if (response.length === 0) {
		return {
			results: [],
			paginationToken: undefined,
		};
	}

	return {
		results: response.map((entry: IDataObject) => ({
			name: entry.data || (entry.attachment as IDataObject)?.name || entry.message || entry._id,
			value: entry._id,
		})),
		paginationToken: to,
	};
}
