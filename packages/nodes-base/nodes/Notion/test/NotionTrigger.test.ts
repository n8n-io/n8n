import moment from 'moment-timezone';
import { deepCopy } from 'n8n-workflow';

import * as GenericFunctions from '../shared/GenericFunctions';

jest.mock('../shared/GenericFunctions', () => ({
	...jest.requireActual<typeof GenericFunctions>('../shared/GenericFunctions'),
	notionApiRequest: jest.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as jest.Mock;

function createPollContext(
	staticData: Record<string, unknown> = {},
	mode: 'trigger' | 'manual' = 'trigger',
) {
	return {
		getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
		getNodeParameter: jest.fn().mockImplementation((name: string) => {
			const params: Record<string, unknown> = {
				databaseId: 'test-db-id',
				event: 'pageAddedToDatabase',
				simple: false,
			};
			return params[name];
		}),
		getMode: jest.fn().mockReturnValue(mode),
		getNode: jest.fn().mockReturnValue({ typeVersion: 1, name: 'Notion Trigger' }),
		helpers: {
			returnJsonArray: jest
				.fn()
				.mockImplementation((data: unknown[]) => data.map((d) => ({ json: d }))),
		},
	};
}

describe('NotionTrigger', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('staticData serialization', () => {
		it('should store lastTimeChecked as a string, not a moment object', async () => {
			mockNotionApiRequest.mockResolvedValueOnce({ results: [] });

			const staticData: Record<string, unknown> = {};
			const ctx = createPollContext(staticData);

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			await trigger.poll.call(ctx as never);

			expect(typeof staticData.lastTimeChecked).toBe('string');
			expect(staticData.lastTimeChecked).not.toBeInstanceOf(Object);
		});

		it('should survive JSON round-trip serialization', async () => {
			mockNotionApiRequest.mockResolvedValueOnce({ results: [] });

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

			mockNotionApiRequest.mockResolvedValue({ results: [] });

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
			mockNotionApiRequest.mockResolvedValueOnce({ results: [] });

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
			mockNotionApiRequest.mockResolvedValueOnce({ results: [] });

			const ctx = createPollContext();

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

			mockNotionApiRequest.mockResolvedValueOnce({ results: [page] });

			const ctx = createPollContext({}, 'manual');

			const { NotionTrigger } = await import('../NotionTrigger.node');
			const trigger = new NotionTrigger();
			const result = await trigger.poll.call(ctx as never);

			expect(result).not.toBeNull();
			expect(ctx.helpers.returnJsonArray).toHaveBeenCalledWith([page]);
		});
	});
});
