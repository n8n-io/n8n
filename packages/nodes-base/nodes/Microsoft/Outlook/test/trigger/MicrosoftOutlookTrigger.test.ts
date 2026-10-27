import { DateTime } from 'luxon';
import { mockDeep } from 'vitest-mock-extended';
import type { IPollFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';

import { MicrosoftOutlookTrigger } from '../../MicrosoftOutlookTrigger.node';

vi.mock('../../trigger/GenericFunctions', () => ({
	getPollResponse: vi.fn(),
}));

import { getPollResponse } from '../../trigger/GenericFunctions';
import type { Mock, Mocked } from 'vitest';

describe('MicrosoftOutlookTrigger', () => {
	let trigger: MicrosoftOutlookTrigger;
	let mockPollFunctions: Mocked<IPollFunctions>;
	let staticData: IDataObject;

	beforeEach(() => {
		trigger = new MicrosoftOutlookTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		staticData = {};
		mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		vi.clearAllMocks();
	});

	describe('poll', () => {
		it('should rethrow and keep lastTimeChecked when a scheduled poll fails after a previous run', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			mockPollFunctions.getMode.mockReturnValue('trigger');
			(getPollResponse as Mock).mockRejectedValue(new Error('API request failed'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API request failed');
			expect(staticData.lastTimeChecked).toBe(previousTimestamp);
		});

		it('should rethrow error when API call fails and lastTimeChecked is not set', async () => {
			mockPollFunctions.getMode.mockReturnValue('trigger');
			(getPollResponse as Mock).mockRejectedValue(new Error('API request failed'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API request failed');
		});

		it('should rethrow error in manual mode', async () => {
			staticData.lastTimeChecked = '2023-01-01T00:00:00.000Z';
			mockPollFunctions.getMode.mockReturnValue('manual');
			(getPollResponse as Mock).mockRejectedValue(new Error('API request failed'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API request failed');
		});

		it('should store the cursor returned by the poll response when poll returns results', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			const fakeNow = DateTime.fromISO('2023-01-02T00:00:00.000Z');
			vi.spyOn(DateTime, 'now').mockReturnValue(fakeNow);

			// A capped poll returns a cursor before now; poll must store that cursor, not now.
			const cursor = '2023-01-01T12:00:00.000Z';
			const mockResults: INodeExecutionData[] = [{ json: { id: 'msg1', subject: 'Test' } }];
			(getPollResponse as Mock).mockResolvedValue({ items: mockResults, cursor });

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toEqual([mockResults]);
			expect(staticData.lastTimeChecked).toBe(cursor);
		});

		it('should advance lastTimeChecked when poll returns empty results', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			const fakeNow = DateTime.fromISO('2023-01-02T00:00:00.000Z');
			vi.spyOn(DateTime, 'now').mockReturnValue(fakeNow);

			(getPollResponse as Mock).mockResolvedValue({ items: [], cursor: fakeNow.toISO() });

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(staticData.lastTimeChecked).toBe(fakeNow.toISO());
		});
	});
});
