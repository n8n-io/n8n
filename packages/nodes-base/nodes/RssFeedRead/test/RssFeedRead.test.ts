import type {
	IDeclarativePollingTrigger,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { feedToItems, RssFeedReadTrigger } from '../RssFeedReadTrigger.node';

const rss = (entries: string) =>
	`<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${entries}</channel></rss>`;
const entry = (title: string, pubDate?: string) =>
	`<item><title>${title}</title>${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}</item>`;

const run = async (body: string) =>
	await feedToItems.call(mock<IExecuteSingleFunctions>(), [], mock<IN8nHttpFullResponse>({ body }));

describe('RssFeedReadTrigger', () => {
	it('declares a timestamp polling trigger on isoDate', () => {
		const trigger = new RssFeedReadTrigger().description.trigger as IDeclarativePollingTrigger;
		expect(trigger).toMatchObject({
			type: 'polling',
			cursor: { type: 'timestamp', field: 'isoDate' },
		});
		expect(trigger.routing.request?.url).toBe('={{ $parameter.feedUrl }}');
	});

	it('parses the feed into items, oldest first', async () => {
		const items = await run(
			rss(
				entry('newest', 'Tue, 02 Jan 2024 00:00:00 GMT') +
					entry('oldest', 'Mon, 01 Jan 2024 00:00:00 GMT'),
			),
		);

		expect(items.map((item) => item.json.title)).toEqual(['oldest', 'newest']);
		expect(items[1].json.isoDate).toBe('2024-01-02T00:00:00.000Z');
	});

	it('keeps entries without a date so the engine can skip them', async () => {
		const items = await run(rss(entry('undated')));

		expect(items).toEqual([{ json: expect.objectContaining({ title: 'undated' }) }]);
		expect(items[0].json.isoDate).toBeUndefined();
	});

	it('returns no items for an empty feed', async () => {
		expect(await run(rss(''))).toEqual([]);
	});
});
