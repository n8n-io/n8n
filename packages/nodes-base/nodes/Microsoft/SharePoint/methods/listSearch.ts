import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import type { IDriveItem, IList, IListItem, ISite } from '../helpers/interfaces';
import { escapeFilterValue } from '../helpers/utils';
import { microsoftSharePointApiRequest } from '../transport';

export async function getDrives(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const siteParameter = this.getNodeParameter('site', undefined, { extractValue: true });
	if (typeof siteParameter !== 'string') {
		throw new Error('Site parameter must be a string');
	}
	const site = siteParameter;

	const results: INodeListSearchItems[] = [];

	// Get all lists and find which ones are document libraries (have drives)
	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			{ $top: 100 },
		);
	}

	interface IListWithMetadata {
		id: string;
		displayName: string;
		list?: { hidden?: boolean; template?: string };
	}

	const lists: IListWithMetadata[] = response.value ?? [];

	// Check each non-hidden list to see if it has a drive (is a document library)
	for (const list of lists) {
		if (list.list?.hidden) continue;

		try {
			const driveResponse = await microsoftSharePointApiRequest.call(
				this,
				'GET',
				`/sites/${site}/lists/${list.id}/drive`,
				{},
			);
			if (driveResponse.id) {
				const driveName = list.displayName || driveResponse.name || list.id;
				if (!filter || driveName.toLowerCase().includes(filter.toLowerCase())) {
					if (!results.some((r) => r.value === driveResponse.id)) {
						results.push({
							name: driveName,
							value: driveResponse.id,
						});
					}
				}
			}
		} catch (error: unknown) {
			// Lists that aren't document libraries return 404 – skip those.
			// Re-throw unexpected errors (auth failures, network issues, etc.).
			const httpCode = (error as { httpCode?: string }).httpCode;
			if (httpCode !== '404') {
				throw error;
			}
		}
	}

	results.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
	);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const driveParameter = this.getNodeParameter('drive', undefined, { extractValue: true });
	if (typeof driveParameter !== 'string') {
		throw new Error('Drive parameter must be a string');
	}
	const drive = driveParameter;
	const folder = this.getNodeParameter('folder', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drives/${drive}/items/${folder}/children`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		// File filter not supported
		// https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/filtering-results?view=odsp-graph-online#filterable-properties
		const qs: IDataObject = {
			$select: 'id,name,file',
		};
		if (filter) {
			qs.$filter = `startswith(name, '${escapeFilterValue(filter)}')`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drives/${drive}/items/${folder}/children`,
			{},
			qs,
		);
	}

	const items: IDriveItem[] = response.value;

	const results: INodeListSearchItems[] = items
		.filter((x) => x.file)
		.map((g) => ({
			name: g.name,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const driveParameter = this.getNodeParameter('drive', undefined, { extractValue: true });
	if (typeof driveParameter !== 'string') {
		throw new Error('Drive parameter must be a string');
	}
	const drive = driveParameter;

	const allFolders: INodeListSearchItems[] = [];

	// Iterative BFS to walk the folder tree — avoids stack overflow on deep hierarchies
	const MAX_CONCURRENT = 5;
	const queue: Array<{ parentId: string; parentPath: string }> = [
		{ parentId: 'root', parentPath: '' },
	];

	while (queue.length > 0) {
		const batch = queue.splice(0, MAX_CONCURRENT);

		await Promise.all(
			batch.map(async ({ parentId, parentPath }) => {
				let nextUrl: string | undefined;
				do {
					let response: unknown;
					if (nextUrl) {
						response = await microsoftSharePointApiRequest.call(
							this,
							'GET',
							'',
							{},
							undefined,
							undefined,
							nextUrl,
						);
					} else {
						response = await microsoftSharePointApiRequest.call(
							this,
							'GET',
							`/sites/${site}/drives/${drive}/items/${parentId}/children`,
							{},
							{
								$select: 'id,name,folder',
								$filter: 'folder ne null',
							},
						);
					}

					const body = response as { value?: IDriveItem[]; '@odata.nextLink'?: string };
					const items: IDriveItem[] = body.value ?? [];

					for (const item of items) {
						if (!item.folder) continue;
						const fullPath = `${parentPath}/${item.name}`;
						allFolders.push({ name: fullPath, value: item.id });
						queue.push({ parentId: item.id, parentPath: fullPath });
					}

					nextUrl = body['@odata.nextLink'];
				} while (nextUrl);
			}),
		);
	}

	const filteredFolders = filter
		? allFolders.filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()))
		: allFolders;

	filteredFolders.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
	);

	const rootOption: INodeListSearchItems = {
		name: '/ (Library Root)',
		value: 'root',
	};

	const results: INodeListSearchItems[] =
		!filter || rootOption.name.toLowerCase().includes(filter.toLowerCase())
			? [rootOption, ...filteredFolders]
			: filteredFolders;

	return { results };
}

export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const list = this.getNodeParameter('list', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists/${list}/items`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$expand: 'fields(select=Title)',
			$select: 'id,fields',
		};
		if (filter) {
			qs.$filter = `fields/Title eq '${escapeFilterValue(filter)}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists/${list}/items`,
			{},
			qs,
		);
	}

	const items: IListItem[] = response.value;

	const results: INodeListSearchItems[] = items
		.map((g) => ({
			name: g.fields.Title ?? g.id,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getLists(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,displayName',
		};
		if (filter) {
			qs.$filter = `displayName eq '${escapeFilterValue(filter)}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			qs,
		);
	}

	const lists: IList[] = response.value;

	const results: INodeListSearchItems[] = lists
		.map((g) => ({
			name: g.displayName,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getSites(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			'/sites',
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,title',
			$search: '*',
		};
		if (filter) {
			qs.$search = filter;
		}
		response = await microsoftSharePointApiRequest.call(this, 'GET', '/sites', {}, qs);
	}

	const sites: ISite[] = response.value;

	const results: INodeListSearchItems[] = sites
		.map((g) => ({
			name: g.title,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}
