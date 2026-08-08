import { mock } from 'vitest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type { IPollFunctions } from 'n8n-workflow';
import Parser from 'rss-parser';

import { RssFeedReadTrigger } from '../RssFeedReadTrigger.node';
import type { Mock } from 'vitest';

vi.mock('rss-parser');

const now = new Date('2024-02-01T01:23:45.678Z');
vi.useFakeTimers({ now });

describe('RssFeedReadTrigger', () => {
	describe('poll', () => {
		const feedUrl = 'https://example.com/feed';
		const lastItemDate = '2022-01-01T00:00:00.000Z';
		const newItemDate = '2022-01-02T00:00:00.000Z';

		const node = new RssFeedReadTrigger();
		const helpers = mock<IPollFunctions['helpers']>({ returnJsonArray });
		const pollFunctions = mock<IPollFunctions>({ helpers });

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should throw an error if the feed URL is empty', async () => {
			pollFunctions.getNodeParameter.mockReturnValue('');

			await expect(node.poll.call(pollFunctions)).rejects.toThrowError();

			expect(pollFunctions.getNodeParameter).toHaveBeenCalledWith('feedUrl');
			expect(helpers.httpRequest).not.toHaveBeenCalled();
			expect(Parser.prototype.parseString).not.toHaveBeenCalled();
		});

		it('should return new items from the feed', async () => {
			const pollData = mock({ lastItemDate });
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(pollData);
			helpers.httpRequest.mockResolvedValue('<rss />');
			(Parser.prototype.parseString as Mock).mockResolvedValue({
				items: [{ isoDate: lastItemDate }, { isoDate: newItemDate }],
			});

			const result = await node.poll.call(pollFunctions);

			expect(result).toEqual([[{ json: { isoDate: newItemDate } }]]);
			expect(pollFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
			expect(pollFunctions.getNodeParameter).toHaveBeenCalledWith('feedUrl');
			expect(helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'GET', url: feedUrl }),
			);
			expect(Parser.prototype.parseString).toHaveBeenCalledWith('<rss />');
			expect(pollData.lastItemDate).toEqual(newItemDate);
		});

		it('should gracefully handle missing timestamps', async () => {
			const pollData = mock();
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(pollData);
			helpers.httpRequest.mockResolvedValue('<rss />');
			(Parser.prototype.parseString as Mock).mockResolvedValue({ items: [{}, {}] });

			const result = await node.poll.call(pollFunctions);

			expect(result).toEqual(null);
			expect(pollFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
			expect(pollFunctions.getNodeParameter).toHaveBeenCalledWith('feedUrl');
			expect(helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'GET', url: feedUrl }),
			);
			expect(Parser.prototype.parseString).toHaveBeenCalledWith('<rss />');
		});

		it('should return null if the feed is empty', async () => {
			const pollData = mock({ lastItemDate });
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(pollData);
			helpers.httpRequest.mockResolvedValue('<rss />');
			(Parser.prototype.parseString as Mock).mockResolvedValue({ items: [] });

			const result = await node.poll.call(pollFunctions);

			expect(result).toEqual(null);
			expect(pollFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
			expect(pollFunctions.getNodeParameter).toHaveBeenCalledWith('feedUrl');
			expect(helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'GET', url: feedUrl }),
			);
			expect(Parser.prototype.parseString).toHaveBeenCalledWith('<rss />');
			expect(pollData.lastItemDate).toEqual(lastItemDate);
		});

		it('should not throw and should return null when the feed responds 429 (rate limited)', async () => {
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(mock({ lastItemDate }));
			const rateLimitError = Object.assign(new Error('Too Many Requests'), {
				httpCode: '429',
				response: { status: 429 },
			});
			helpers.httpRequest.mockRejectedValue(rateLimitError);

			await expect(node.poll.call(pollFunctions)).resolves.toEqual(null);
			expect(helpers.httpRequest).toHaveBeenCalledTimes(1);
			expect(Parser.prototype.parseString).not.toHaveBeenCalled();
		});

		it('should not throw and should return null when the feed responds 5xx (server error)', async () => {
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(mock({ lastItemDate }));
			const serverError = Object.assign(new Error('Bad Gateway'), {
				httpCode: '502',
				response: { status: 502 },
			});
			helpers.httpRequest.mockRejectedValue(serverError);

			await expect(node.poll.call(pollFunctions)).resolves.toEqual(null);
			expect(helpers.httpRequest).toHaveBeenCalledTimes(1);
		});

		it('should still throw a clear error for a permanently broken feed (404)', async () => {
			pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
			pollFunctions.getWorkflowStaticData.mockReturnValue(mock({ lastItemDate }));
			const notFound = Object.assign(new Error('Not Found'), {
				httpCode: '404',
				response: { status: 404 },
			});
			helpers.httpRequest.mockRejectedValue(notFound);

			await expect(node.poll.call(pollFunctions)).rejects.toThrowError();
			expect(Parser.prototype.parseString).not.toHaveBeenCalled();
		});
	});
});
