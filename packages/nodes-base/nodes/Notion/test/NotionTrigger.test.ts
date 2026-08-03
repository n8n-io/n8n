import moment from 'moment-timezone';
import { deepCopy } from 'n8n-workflow';

import * as GenericFunctions from '../shared/GenericFunctions';
import * as Transport from '../v3/transport';
import type { Mock } from 'vitest';

vi.mock('../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../shared/GenericFunctions')),
	notionApiRequest: vi.fn(),
}));

vi.mock('../v3/transport', async () => ({
	...(await vi.importActual<typeof Transport>('../v3/transport')),
	notionApiRequestV3: vi.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as Mock;
const mockNotionApiRequestV3 = Transport.notionApiRequestV3 as Mock;

function createPollContext(
	staticData: Record<string, unknown> = {},
	mode: 'trigger' | 'manual' = 'trigger',
	typeVersion = 1.1,
) {
	return {
		getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
		getNodeParameter: vi.fn().mockImplementation((name: string) => {
			const params: Record<string, unknown> = {
				databaseId: 'test-db-id',
				dataSourceId: 'test-data-source-id',
				event: 'pageAddedToDatabase',
				simple: false,
			};
			return params[name];
		}),
		getMode: vi.fn().mockReturnValue(mode),
		getNode: vi.fn().mockReturnValue({
			typeVersion,
			name: 'Notion Trigger',
			type: 'n8n-nodes-base.notionTrigger',
		}),
		helpers: {
			returnJsonArray: vi
				.fn()
				.mockImplementation((data: unknown[]) => data.map((d) => ({ json: d }))),
		},
	};
}

describe('NotionTrigger', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('staticData serialization', () => {
		it('should store lastTimeChecked as a string, not a moment object', async () => {
			mockNotionApiRequestV3.mockResolvedValueOnce({ results: [] });

			const staticData: Record<string, unknown> = {};
			const ctx = createPollContext(staticData);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			await trigger.poll.call(ctx as never);

			expect(typeof staticData.lastTimeChecked).toBe('string');
			expect(staticData.lastTimeChecked).not.toBeInstanceOf(Object);
		});

		it('should survive JSON round-trip serialization', async () => {
			mockNotionApiRequestV3.mockResolvedValueOnce({ results: [] });

			const staticData: Record<string, unknown> = {};
			const ctx = createPollContext(staticData);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			await trigger.poll.call(ctx as never);

			const roundTripped = deepCopy(staticData);
			expect(typeof roundTripped.lastTimeChecked).toBe('string');
			expect(roundTripped.lastTimeChecked).toBe(staticData.lastTimeChecked);
			expect(moment(roundTripped.lastTimeChecked as string).isValid()).toBe(true);
		});

		it('should correctly parse a stored ISO string on subsequent poll', async () => {
			const previousTimestamp = '2026-04-30T10:00:00Z';

			mockNotionApiRequestV3.mockResolvedValue({ results: [] });

			const staticData: Record<string, unknown> = {
				lastTimeChecked: previousTimestamp,
			};
			const ctx = createPollContext(staticData);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			await trigger.poll.call(ctx as never);

			expect(typeof staticData.lastTimeChecked).toBe('string');
			expect(staticData.lastTimeChecked).not.toBe(previousTimestamp);
		});

		it('should have zeroed seconds and milliseconds', async () => {
			mockNotionApiRequestV3.mockResolvedValueOnce({ results: [] });

			const staticData: Record<string, unknown> = {};
			const ctx = createPollContext(staticData);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			await trigger.poll.call(ctx as never);

			const parsed = moment(staticData.lastTimeChecked as string);
			expect(parsed.seconds()).toBe(0);
			expect(parsed.milliseconds()).toBe(0);
		});
	});

	describe('poll behavior', () => {
		it('should return null when no new pages are found', async () => {
			mockNotionApiRequestV3.mockResolvedValueOnce({ results: [] });

			const ctx = createPollContext();

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			const result = await trigger.poll.call(ctx as never);

			expect(result).toBeNull();
			expect(mockNotionApiRequestV3).toHaveBeenCalledWith(
				'POST',
				'/data_sources/test-data-source-id/query',
				expect.objectContaining({ page_size: 1 }),
			);
		});

		it('should keep v1 polling on the legacy database API', async () => {
			mockNotionApiRequest.mockResolvedValueOnce({ results: [] });

			const ctx = createPollContext({}, 'trigger', 1);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			const result = await trigger.poll.call(ctx as never);

			expect(result).toBeNull();
			expect(mockNotionApiRequest).toHaveBeenCalledWith(
				'POST',
				'/databases/test-db-id/query',
				expect.objectContaining({ page_size: 1 }),
				{},
				'',
				expect.objectContaining({
					headers: { 'Notion-Version': '2022-02-22' },
				}),
			);
			expect(mockNotionApiRequestV3).not.toHaveBeenCalled();
		});

		it('should return null when the probe returns a record but the follow-up fetch returns an empty page', async () => {
			const page = {
				id: 'page-1',
				created_time: '2026-04-30T12:00:00.000Z',
				last_edited_time: '2026-04-30T12:00:00.000Z',
				properties: {},
			};

			mockNotionApiRequest
				.mockResolvedValueOnce({ results: [page] })
				.mockResolvedValueOnce({ results: [], has_more: false, next_cursor: null });

			const ctx = createPollContext({}, 'trigger', 1);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			const result = await trigger.poll.call(ctx as never);

			expect(result).toBeNull();
		});

		it('should return pages in manual mode', async () => {
			const page = {
				id: 'page-1',
				created_time: '2026-04-30T12:00:00.000Z',
				last_edited_time: '2026-04-30T12:00:00.000Z',
				properties: {},
			};

			mockNotionApiRequestV3.mockResolvedValueOnce({ results: [page] });

			const ctx = createPollContext({}, 'manual');

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			const result = await trigger.poll.call(ctx as never);

			expect(result).not.toBeNull();
			expect(ctx.helpers.returnJsonArray).toHaveBeenCalledWith([page]);
		});
	});
});
