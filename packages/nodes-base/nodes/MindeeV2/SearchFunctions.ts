import type { INodeListSearchResult, ILoadOptionsFunctions } from 'n8n-workflow';

import { mindeeApiRequest } from './GenericFunctions';

const MODELS_URL = 'https://api-v2.mindee.net/v2/search/models';
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
	const page = paginationToken ? +paginationToken : 1;
	const res = await mindeeApiRequest.call(
		this,
		'GET',
		MODELS_URL,
		{},
		{
			name: filter,
			page,
			per_page: PER_PAGE,
		},
	);
	const models = (res?.models ?? []) as Array<{ id: string; name: string }>;
	const outputModels = models.map((m) => ({ name: m.name ?? m.id, value: m.id }));
	return { results: outputModels };
}
