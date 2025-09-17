import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { ColumnsFetcher } from '../helpers/columns-fetcher';

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
				name: 'v0.260.0 Onwards',
				value: 4,
			},
		];
	} else {
		return [
			{
				name: 'v0.260.0 Onwards',
				value: 4,
			},
		];
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
				value: field.title,
			};
		});
}
