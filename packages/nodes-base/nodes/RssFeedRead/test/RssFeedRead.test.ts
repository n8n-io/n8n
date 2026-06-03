import { mock } from 'jest-mock-extended';
import { returnJsonArray } from 'n8n-core';
import type { INode, IPollFunctions } from 'n8n-workflow';
import Parser from 'rss-parser';

import { RssFeedReadTrigger } from '../RssFeedReadTrigger.node';

jest.mock('rss-parser');

const now = new Date('2024-02-01T01:23:45.678Z');
jest.useFakeTimers({ now });

describe('RssFeedReadTrigger', () => {
	describe('poll', () => {
		const feedUrl = 'https://example.com/feed';
		const lastItemDate = '2022-01-01T00:00:00.000Z';
		const newItemDate = '2022-01-02T00:00:00.000Z';

		const node = new RssFeedReadTrigger();
		const helpers = mock<IPollFunctions['helpers']>({ returnJsonArray });
		const pollFunctions = mock<IPollFunctions>({ helpers });

		beforeEach(() => {
			jest.clearAllMocks();
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
			(Parser.prototype.parseString as jest.Mock).mockResolvedValue({
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
			(Parser.prototype.parseString as jest.Mock).mockResolvedValue({ items: [{}, {}] });

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
			(Parser.prototype.parseString as jest.Mock).mockResolvedValue({ items: [] });

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

		describe('error handling honors node.onError', () => {
			const httpError = Object.assign(new Error('Request failed with status code 404'), {
				code: 404,
			});

			const setupPoll = (nodeOverrides: Partial<INode>, mode: 'trigger' | 'manual' = 'trigger') => {
				pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
				pollFunctions.getWorkflowStaticData.mockReturnValue(mock({}));
				pollFunctions.getMode.mockReturnValue(mode);
				pollFunctions.getNode.mockReturnValue(
					mock<INode>({ name: 'RSS Feed Trigger', ...nodeOverrides }),
				);
				helpers.httpRequest.mockRejectedValue(httpError);
			};

			it('emits an item with json.error when onError is "continueErrorOutput"', async () => {
				// The execution engine moves items with `json.error` to the error output
				// (see WorkflowExecute.handleNodeErrorOutput). The trigger only needs to
				// emit the item; the engine handles the routing.
				setupPoll({ onError: 'continueErrorOutput' });

				const result = await node.poll.call(pollFunctions);

				expect(result).toEqual([[{ json: { error: 'Request failed with status code 404' } }]]);
			});

			it('emits an item with json.error when onError is "continueRegularOutput"', async () => {
				setupPoll({ onError: 'continueRegularOutput' });

				const result = await node.poll.call(pollFunctions);

				expect(result).toEqual([[{ json: { error: 'Request failed with status code 404' } }]]);
			});

			it('emits an item with json.error when legacy continueOnFail is true', async () => {
				setupPoll({ continueOnFail: true });

				const result = await node.poll.call(pollFunctions);

				expect(result).toEqual([[{ json: { error: 'Request failed with status code 404' } }]]);
			});

			it('throws when onError is "stopWorkflow"', async () => {
				setupPoll({ onError: 'stopWorkflow' });

				await expect(node.poll.call(pollFunctions)).rejects.toThrow(
					'Request failed with status code 404',
				);
			});

			it('throws when onError is unset (default behavior)', async () => {
				setupPoll({});

				await expect(node.poll.call(pollFunctions)).rejects.toThrow(
					'Request failed with status code 404',
				);
			});

			it('emits an item with json.error in manual mode too', async () => {
				setupPoll({ onError: 'continueErrorOutput' }, 'manual');

				const result = await node.poll.call(pollFunctions);

				expect(result).toEqual([[{ json: { error: 'Request failed with status code 404' } }]]);
			});

			it('formats ECONNREFUSED errors with a friendly message when routed to the error output', async () => {
				pollFunctions.getNodeParameter.mockReturnValue(feedUrl);
				pollFunctions.getWorkflowStaticData.mockReturnValue(mock({}));
				pollFunctions.getMode.mockReturnValue('trigger');
				pollFunctions.getNode.mockReturnValue(
					mock<INode>({ name: 'RSS Feed Trigger', onError: 'continueErrorOutput' }),
				);
				const connectionError = Object.assign(new Error('connect ECONNREFUSED'), {
					code: 'ECONNREFUSED',
				});
				helpers.httpRequest.mockRejectedValue(connectionError);

				const result = await node.poll.call(pollFunctions);

				expect(result).toEqual([
					[
						{
							json: {
								error: `It was not possible to connect to the URL. Please make sure the URL "${feedUrl}" it is valid!`,
							},
						},
					],
				]);
			});
		});
	});
});
