import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	NodeApiError,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseToApiNodeOperationError } from '../helpers';
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
	const configWorkspaceId = this.getNodeParameter('workspaceId', 0, {
		extractValue: true,
	}) as string;

	const workspaceId = !configWorkspaceId || configWorkspaceId === 'none' ? 'nc' : configWorkspaceId;
	const baseUrl = await getBaseUrl.call(this);
	const constructUrl = (baseId: string) => {
		return `${baseUrl}/#/${workspaceId}/${baseId}`;
	};

	try {
		const requestMethod = 'GET';
		const endpoint = `/api/v3/meta/workspaces/${workspaceId}/bases`;
		const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
		let results: INodeListSearchItems[] = responseData.list.map((i: IDataObject) => ({
			name: i.title,
			value: i.id,
			url: constructUrl(i.id as string),
		}));
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
			const endpoint = `/api/v3/meta/bases/${baseId}/tables`;
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
			throw parseToApiNodeOperationError({
				error: e as NodeApiError,
				errorLevel: 'warning',
				subject: 'Error while fetching tables:',
				node: this.getNode(),
			});
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No base selected!', {
			level: 'warning',
		});
	}
}

export async function getViews(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	const baseUrl = await getBaseUrl.call(this);
	const workspaceId = this.getNodeParameter('workspaceId', 0, {
		extractValue: true,
	}) as string;
	const constructUrl = (viewId: string) => {
		return `${baseUrl}/#/${workspaceId && workspaceId !== 'none' ? workspaceId : 'nc'}/${baseId}/${tableId}/${viewId}`;
	};
	if (tableId) {
		try {
			const requestMethod = 'GET';
			const endpoint = `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			const results = responseData.views.map((i: IDataObject) => {
				return {
					name: i.title,
					value: i.id,
					url: constructUrl(i.id as string),
				};
			});

			return {
				results:
					filter && filter !== ''
						? results.filter((flt: any) => flt.name.includes(filter))
						: results,
			};
		} catch (e) {
			throw parseToApiNodeOperationError({
				error: e as NodeApiError,
				errorLevel: 'warning',
				subject: 'Error while fetching views:',
				node: this.getNode(),
			});
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No table selected!', {
			level: 'warning',
		});
	}
}

export async function getFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	if (tableId) {
		try {
			const requestMethod = 'GET';
			const endpoint = `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});

			const results = responseData.fields.map((i: IDataObject) => {
				return {
					name: i.title,
					value: i.id,
				};
			});

			return {
				results:
					filter && filter !== ''
						? results.filter((flt: any) => flt.name.includes(filter))
						: results,
			};
		} catch (e) {
			throw parseToApiNodeOperationError({
				error: e as NodeApiError,
				errorLevel: 'warning',
				subject: 'Error while fetching fields:',
				node: this.getNode(),
			});
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No table selected!', {
			level: 'warning',
		});
	}
}

// This only supports using the table ID
export async function getTriggerFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
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
				baseId,
				tableId,
			});

			const results = responseData
				.filter((field: any) => {
					return ['CreatedTime', 'LastModifiedTime'].includes(field.type);
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
			throw parseToApiNodeOperationError({
				error: e as NodeApiError,
				errorLevel: 'warning',
				subject: 'Error while fetching fields:',
				node: this.getNode(),
			});
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No table selected!', {
			level: 'warning',
		});
	}
}

export async function getDownloadFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { results } = await getDownloadFieldsId.call(this, filter);
	return {
		results: results.map((field: any) => ({ name: field.name, value: field.name })),
	};
}

export async function getDownloadFieldsId(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const fetcher = new ColumnsFetcher(this);
		const fields = await fetcher.fetchFromDefinedParam();
		return {
			results: fields
				.filter(
					(field: any) => field.type === 'Attachment' && (!filter || field.title.includes(filter)),
				)
				.map((field: any) => {
					return {
						name: field.title,
						value: field.id,
					};
				}),
		};
	} catch (e) {
		throw parseToApiNodeOperationError({
			error: e as NodeApiError,
			errorLevel: 'warning',
			subject: 'Error while fetching fields:',
			node: this.getNode(),
		});
	}
}

export async function getLinkFieldsId(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const fetcher = new ColumnsFetcher(this);
		const fields = await fetcher.fetchFromDefinedParam();
		return {
			results: fields
				.filter(
					(field: any) =>
						['Link', 'LinkToAnotherRecord'].includes(field.type) &&
						(!filter || field.title.includes(filter)),
				)
				.map((field: any) => {
					return {
						name: field.title,
						value: field.id,
					};
				}),
		};
	} catch (e) {
		throw parseToApiNodeOperationError({
			error: e as NodeApiError,
			errorLevel: 'warning',
			subject: 'Error while fetching fields:',
			node: this.getNode(),
		});
	}
}

export async function getRelatedTableFields(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	const linkFieldName = this.getNodeParameter('linkFieldName', 0, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	if (linkFieldName) {
		try {
			const requestMethod = 'GET';
			let endpoint = `/api/v3/meta/bases/${baseId}/tables/${tableId}/fields/${linkFieldName}`;
			let responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			const relatedTableId = responseData.options?.related_table_id;
			if (!relatedTableId) {
				return { results: [] };
			}

			endpoint = `/api/v3/meta/bases/${baseId}/tables/${relatedTableId}`;
			responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});

			return {
				results: responseData.fields.map((i: IDataObject) => {
					return {
						name: i.title,
						value: i.id,
					};
				}),
			};
		} catch (e) {
			throw parseToApiNodeOperationError({
				error: e as NodeApiError,
				errorLevel: 'warning',
				subject: 'Error while fetching fields:',
				node: this.getNode(),
			});
		}
	} else {
		throw new NodeOperationError(this.getNode(), 'No link field selected!', {
			level: 'warning',
		});
	}
}
