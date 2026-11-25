import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { RssFeedRead } from '../RssFeedRead.node';

describe('RSS Read, annotations', () => {
	const { description } = new RssFeedRead();

	it.each([1, 1.1, 1.2])('should resolve version %s as read-only', (typeVersion) => {
		expect(resolveNodeAnnotations(description, { parameters: {}, typeVersion })).toEqual(
			READ_ONLY_ANNOTATIONS,
		);
	});
});
