import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { HighLevelV1 } from './v1/HighLevelV1.node';
import { HighLevelV2 } from './v2/HighLevelV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'HighLevel',
	name: 'highLevel',
	icon: 'file:highLevel.svg',
	group: ['transform'],
	description: 'Consume HighLevel API',
	defaultVersion: 2,
};

function collectUrls(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(collectUrls);
	if (value === null || typeof value !== 'object') return [];

	return Object.entries(value).flatMap(([key, child]) => {
		if (key === 'url' && typeof child === 'string') return [child];
		return collectUrls(child);
	});
}

describe('HighLevel node', () => {
	it.each([
		{
			version: 1,
			description: new HighLevelV1(baseDescription).description,
		},
		{
			version: 2,
			description: new HighLevelV2(baseDescription).description,
		},
	])('encodes every dynamic request URL path segment in v$version', ({ description }) => {
		const dynamicUrls = collectUrls(description.properties).filter((url) =>
			url.includes('$parameter'),
		);

		expect(dynamicUrls.length).toBeGreaterThan(0);
		for (const url of dynamicUrls) {
			const dynamicExpressions = [...url.matchAll(/{{\s*(.*?)\s*}}/g)]
				.map((match) => match[1])
				.filter((expression) => expression.includes('$parameter'));

			expect(url.replace(/{{\s*(.*?)\s*}}/g, '')).not.toContain('$parameter');
			expect(dynamicExpressions.length).toBeGreaterThan(0);
			for (const expression of dynamicExpressions) {
				expect(expression).toMatch(/^toPathSegment\(.+\)$/);
			}
		}
	});
});
