import { IDataObject, ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';
import { ColumnsFetcher } from './columns-fetcher';
import { apiRequest } from '../GenericFunctions';

export async function getApiVersions(this: ILoadOptionsFunctions) {
	const operation = this.getNodeParameter('operation', 0) as string;
	const resource = this.getNodeParameter('resource', 0) as string;
	if (resource === 'row' && ['get', 'getAll', 'create', 'update', 'delete'].includes(operation)) {
		return [
			{
				name: 'v0.200.0 Onwards',
				value: 3,
			},
			{
				name: 'v0.240.0 Onwards',
				value: 4,
			},
		];
	} else {
		return [
			{
				name: 'v0.240.0 Onwards',
				value: 4,
			},
		];
	}
}

export async function getViews(this: ILoadOptionsFunctions) {
	const version = this.getNodeParameter('version', 0) as number;
	const baseId = this.getNodeParameter('projectId', 0, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	if (tableId) {
		try {
			const requestMethod = 'GET';
			const endpoint =
				version === 3
					? `/api/v2/meta/tables/${tableId}/views`
					: `/api/v3/meta/bases/${baseId}/tables/${tableId}/views`;
			const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
			return responseData.list.map((i: IDataObject) => {
				if (i.is_default) {
					return {
						name: 'Default View',
						value: '',
					};
				}
				return {
					name: i.title,
					value: i.id,
				};
			});
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
		throw new NodeOperationError(this.getNode(), `No table selected!`, {
			level: 'warning',
		});
	}
}

export async function getDownloadFields(this: ILoadOptionsFunctions) {
	const version = this.getNodeParameter('version', 0) as number;

	const fetcher = new ColumnsFetcher(this);
	const fields = await fetcher.fetchFromDefinedParam();
	return fields
		.filter((field: any) => (version === 4 ? field.type : field.uidt) === 'Attachment')
		.map((field: any) => {
			return {
				name: field.title,
				value: field.id,
			};
		});
}
