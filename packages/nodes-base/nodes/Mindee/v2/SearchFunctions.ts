import type { INodeListSearchResult, ILoadOptionsFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { mindeeApiRequest, ROOT_URL } from './GenericFunctions';

const MODELS_URL = requestUrl`${ROOT_URL}/search/models`;
const PER_PAGE = 50;

/**
 * Get models from Mindee API
 * @param filter Name filter.
 * @param paginationToken Pagination token.
 */
export async function getModels(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const modelFilter = this.getCurrentNodeParameter('operation', { extractValue: true });
	const page = paginationToken ? +paginationToken : 1;
	const res = await mindeeApiRequest.call(
		this,
		'GET',
		MODELS_URL,
		{},
		{
			name: filter,
			model_type: modelFilter,
			page,
			per_page: PER_PAGE,
		},
	);
	const models = (res?.models ?? []) as Array<{ id: string; name: string }>;
	const outputModels = models.map((m) => ({ name: m.name ?? m.id, value: m.id }));
	const totalPages = (res?.pagination as { total_pages?: number } | undefined)?.total_pages ?? 0;
	return {
		results: outputModels,
		paginationToken: page < totalPages ? String(page + 1) : undefined,
	};
}
