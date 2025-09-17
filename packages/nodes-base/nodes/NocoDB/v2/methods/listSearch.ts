import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ColumnsFetcher } from '../helpers/columns-fetcher';
import { apiRequest } from '../transport';

async function getBaseUrl(this: ILoadOptionsFunctions) {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentials = await this.getCredentials(authenticationMethod);
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	return credentials.host as string;
}

export async function getWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const baseUrl = await getBaseUrl.call(this);
		const constructUrl = (workspaceId: string) => {
			return `${baseUrl}/#/${workspaceId && workspaceId !== 'none' ? workspaceId : 'nc'}`;
		};

		const requestMethod = 'GET';
		// no v3 api yet for workspaces list
		const endpoint = '/api/v2/meta/workspaces';
		const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
		const results: INodeListSearchItems[] = responseData.list.map((i: IDataObject) => ({
			name: i.title,
			value: i.id,
			url: constructUrl(i.id as string),
		}));
		return {
			results:
				filter && filter !== '' ? results.filter((flt) => flt.name.includes(filter)) : results,
		};
	} catch (e) {
		return { results: [{ name: 'No Workspace', value: 'none' }] };
	}
}
export async function getBases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const version = this.getNodeParameter('version', 0) as number;
	const workspaceId = this.getNodeParameter('workspaceId', 0, {
		extractValue: true,
	}) as string;
	const baseUrl = await getBaseUrl.call(this);
	const constructUrl = (baseId: string) => {
		return `${baseUrl}/#/${workspaceId && workspaceId !== 'none' ? workspaceId : 'nc'}/${baseId}`;
	};

	try {
		let results: INodeListSearchItems[];
		if (workspaceId && workspaceId !== 'none') {
			const requestMethod = 'GET';
			const endpoint =
				version === 4
					? `/api/v3/meta/workspaces/${workspaceId}/bases`
					: `/api/v2/meta/workspaces/${workspaceId}/bases`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			results = responseData.list.map((i: IDataObject) => ({
				name: i.title,
				value: i.id,
				url: constructUrl(i.id as string),
			}));
		} else {
			const requestMethod = 'GET';
			// no v3 api yet for bases list without workspace
			const endpoint = version === 3 ? '/api/v2/meta/bases/' : '/api/v1/db/meta/projects/';
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			results = responseData.list.map((i: IDataObject) => ({
				name: i.title,
				value: i.id,
				url: constructUrl(i.id as string),
			}));
		}
		if (filter && filter !== '') {
			results = results.filter((flt) => flt.name.includes(filter));
		}
		return { results };
	} catch (e) {
		throw new NodeOperationError(
			this.getNode(),
			new Error('Error while fetching bases!', {
				cause: e,
			}),
			{
				level: 'warning',
			},
		);
	}
}

// This only supports using the Base ID
export async function getTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const version = this.getNodeParameter('version', 0, {
		extractValue: true,
	}) as number;
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	if (baseId) {
		const baseUrl = await getBaseUrl.call(this);
		const workspaceId = this.getNodeParameter('workspaceId', 0, {
			extractValue: true,
		}) as string;
		const constructUrl = (tableId: string) => {
			return `${baseUrl}/#/${workspaceId && workspaceId !== 'none' ? workspaceId : 'nc'}/${baseId}/${tableId}`;
		};
		try {
			const requestMethod = 'GET';
			const endpoint =
				version === 3
					? `/api/v2/meta/bases/${baseId}/tables`
					: `/api/v3/meta/bases/${baseId}/tables`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			const results: INodeListSearchItems[] = responseData.list.map((i: IDataObject) => ({
				name: i.title,
				value: i.id,
				url: constructUrl(i.id as string),
			}));

			return {
				results:
					filter && filter !== '' ? results.filter((flt) => flt.name.includes(filter)) : results,
			};
		} catch (e) {
			throw new NodeOperationError(
				this.getNode(),
				new Error('Error while fetching tables!', { cause: e }),
				{
					level: 'warning',
				},
			);
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No base selected!', {
			level: 'warning',
		});
	}
}

// This only supports using the table ID
export async function getTriggerFields(this: ILoadOptionsFunctions, filter?: string) {
	// version supported is only 4
	const workspaceId = this.getNodeParameter('workspaceId', 0, {
		extractValue: true,
	}) as string;
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;
	if (tableId) {
		try {
			const fetcher = new ColumnsFetcher(this);

			const responseData = await fetcher.fetch({
				version: 4,
				workspaceId,
				baseId,
				tableId,
			});

			const results = responseData
				.filter((field: any) => {
					// TODO: include formula with return type datetime
					return ['DateTime', 'CreatedTime', 'LastModifiedTime'].includes(field.type);
				})
				.map((i: IDataObject) => ({
					name: i.title,
					value: i.title,
				}));

			return {
				results:
					filter && filter !== ''
						? results.filter((flt: any) => flt.name.includes(filter))
						: results,
			};
		} catch (e) {
			throw new NodeOperationError(
				this.getNode(),
				new Error(`Error while fetching fields! ${e.message}`, { cause: e }),
				{
					level: 'warning',
				},
			);
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No table selected!', {
			level: 'warning',
		});
	}
}
