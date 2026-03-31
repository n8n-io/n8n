import type { IDataObject } from 'n8n-workflow';

/**
 * Parses a Pipedrive v1 search API response into a flat array of result objects.
 *
 * The v1 search endpoint returns `data.items[].item` with a `result_score` on each entry.
 * When the response comes from a v2-style paginated helper it may already be a flat array.
 */
export function parseSearchResponse(responseData: IDataObject): IDataObject[] {
	const rawData = responseData.data as IDataObject;

	if (!Array.isArray(responseData.data) && rawData?.items) {
		return (rawData.items as Array<{ result_score: number; item: IDataObject }>).map((entry) => ({
			result_score: entry.result_score,
			...entry.item,
		}));
	}

	if (Array.isArray(responseData.data)) {
		return responseData.data as IDataObject[];
	}

	return [];
}
