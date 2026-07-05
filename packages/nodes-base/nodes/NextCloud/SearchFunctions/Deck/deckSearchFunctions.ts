import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { getNextCloudContext } from '../shared/sharedSearchFunctions';

/**
 * Map a Deck API item to a list search result.
 * Deck entities (boards, stacks, cards, labels) use 'title' as display name.
 */
function toDeckSearchItem(item: IDataObject): { name: string; value: string } {
	const id = item.id;
	return {
		name: String(item.title ?? item.displayname ?? id ?? ''),
		value: String(id),
	};
}

export async function getBoards(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	try {
		const boards = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/index.php/apps/deck/api/v1.1/boards`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as IDataObject[];

		let results = (boards ?? []).map(toDeckSearchItem);
		if (filter) {
			const needle = filter.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(needle));
		}
		return { results };
	} catch (error) {
		console.error('NextCloud Deck getBoards failed:', (error as Error).message);
		return { results: [] };
	}
}

export async function getStacks(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) return { results: [] };

	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	try {
		const stacks = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/index.php/apps/deck/api/v1.1/boards/${encodeURIComponent(boardId)}/stacks`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as IDataObject[];

		let results = (stacks ?? []).map(toDeckSearchItem);
		if (filter) {
			const needle = filter.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(needle));
		}
		return { results };
	} catch (error) {
		console.error('NextCloud Deck getStacks failed:', (error as Error).message);
		return { results: [] };
	}
}

export async function getCards(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	const stackId = this.getCurrentNodeParameter('stackId', { extractValue: true }) as string;
	if (!boardId || !stackId) return { results: [] };

	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	try {
		const cards = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/index.php/apps/deck/api/v1.1/boards/${encodeURIComponent(boardId)}/stacks/${encodeURIComponent(stackId)}/cards`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as IDataObject[];

		let results = (cards ?? []).map(toDeckSearchItem);
		if (filter) {
			const needle = filter.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(needle));
		}
		return { results };
	} catch (error) {
		console.error('NextCloud Deck getCards failed:', (error as Error).message);
		return { results: [] };
	}
}

export async function getLabels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) return { results: [] };

	const ctx = await getNextCloudContext(this);
	if (!ctx) return { results: [] };

	try {
		const board = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${ctx.baseUrl}/index.php/apps/deck/api/v1.1/boards/${encodeURIComponent(boardId)}`,
			headers: {
				'OCS-APIRequest': 'true',
				Accept: 'application/json',
				Authorization: `Basic ${ctx.basicAuth}`,
			},
			json: true,
		})) as IDataObject;

		let results = ((board?.labels as IDataObject[]) ?? []).map(toDeckSearchItem);
		if (filter) {
			const needle = filter.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(needle));
		}
		return { results };
	} catch (error) {
		console.error('NextCloud Deck getLabels failed:', (error as Error).message);
		return { results: [] };
	}
}
