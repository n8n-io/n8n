import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { splunkApiRequest } from '../transport';
import type { SplunkFeedResponse } from '../types';

export async function getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = '/services/authorization/roles';
	const responseData = (await splunkApiRequest.call(this, 'GET', endpoint)) as SplunkFeedResponse;
	const { entry: entries } = responseData.feed;

	return Array.isArray(entries)
		? entries.map((entry) => ({ name: entry.title, value: entry.title }))
		: [{ name: entries.title, value: entries.title }];
}
