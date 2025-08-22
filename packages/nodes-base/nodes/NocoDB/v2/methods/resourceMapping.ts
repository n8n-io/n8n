import type { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

import { ColumnsFetcher } from '../helpers/columns-fetcher';

export async function getResouceMapperFields(this: ILoadOptionsFunctions) {
	const fetcher = new ColumnsFetcher(this);
	return {
		fields: await fetcher.mapperFieldsFromDefinedParam(),
	} as ResourceMapperFields;
}
