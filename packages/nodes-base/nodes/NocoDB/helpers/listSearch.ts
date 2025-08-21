import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	NodeOperationError,
} from 'n8n-workflow';
import { apiRequest } from '../GenericFunctions';
import { ColumnsFetcher } from './columns-fetcher';

export async function getWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const requestMethod = 'GET';
		const endpoint = '/api/v1/workspaces/';
		const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
		const results: INodeListSearchItems[] = responseData.list.map((i: IDataObject) => ({
			name: i.title,
			value: i.id,
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
	try {
		let results: INodeListSearchItems[];
		if (workspaceId && workspaceId !== 'none') {
			const requestMethod = 'GET';
			const endpoint = `/api/v1/workspaces/${workspaceId}/bases/`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			results = responseData.list.map((i: IDataObject) => ({ name: i.title, value: i.id }));
		} else {
			const requestMethod = 'GET';
			const endpoint = version === 3 ? '/api/v2/meta/bases/' : '/api/v1/db/meta/projects/';
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			results = responseData.list.map((i: IDataObject) => ({ name: i.title, value: i.id }));
		}
		if (filter && filter !== '') {
			results = results.filter((flt) => flt.name.includes(filter));
		}
		return { results };
	} catch (e) {
		throw new NodeOperationError(
			this.getNode(),
			new Error(`Error while fetching ${version === 3 ? 'bases' : 'projects'}!`, {
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
		throw new NodeOperationError(
			this.getNode(),
			`No  ${version === 3 ? 'base' : 'project'} selected!`,
			{
				level: 'warning',
			},
		);
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
		throw new NodeOperationError(this.getNode(), `No table selected!`, {
			level: 'warning',
		});
	}
}
