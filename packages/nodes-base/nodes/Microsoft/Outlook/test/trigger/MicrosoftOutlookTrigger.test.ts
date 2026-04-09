import { DateTime } from 'luxon';
import { mockDeep } from 'jest-mock-extended';
import type { IPollFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';

import { MicrosoftOutlookTrigger } from '../../MicrosoftOutlookTrigger.node';

jest.mock('../../trigger/GenericFunctions', () => ({
	getPollResponse: jest.fn(),
}));

import { getPollResponse } from '../../trigger/GenericFunctions';

describe('MicrosoftOutlookTrigger', () => {
	let trigger: MicrosoftOutlookTrigger;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let staticData: IDataObject;

	beforeEach(() => {
		trigger = new MicrosoftOutlookTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		staticData = {};
		mockPollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		jest.clearAllMocks();
	});

	describe('poll', () => {
		it('should not advance lastTimeChecked when API call fails and lastTimeChecked exists', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			mockPollFunctions.getMode.mockReturnValue('trigger');
			(getPollResponse as jest.Mock).mockRejectedValue(new Error('API request failed'));
			mockPollFunctions.getWorkflow.mockReturnValue({ id: 'test-workflow' } as never);
			mockPollFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test Node',
				type: 'n8n-nodes-base.microsoftOutlookTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(staticData.lastTimeChecked).toBe(previousTimestamp);
		});

		it('should rethrow error when API call fails and lastTimeChecked is not set', async () => {
			mockPollFunctions.getMode.mockReturnValue('trigger');
			(getPollResponse as jest.Mock).mockRejectedValue(new Error('API request failed'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API request failed');
		});

		it('should rethrow error in manual mode', async () => {
			staticData.lastTimeChecked = '2023-01-01T00:00:00.000Z';
			mockPollFunctions.getMode.mockReturnValue('manual');
			(getPollResponse as jest.Mock).mockRejectedValue(new Error('API request failed'));

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API request failed');
		});

		it('should advance lastTimeChecked when poll returns results', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			const fakeNow = DateTime.fromISO('2023-01-02T00:00:00.000Z');
			jest.spyOn(DateTime, 'now').mockReturnValue(fakeNow);

			const mockResults: INodeExecutionData[] = [{ json: { id: 'msg1', subject: 'Test' } }];
			(getPollResponse as jest.Mock).mockResolvedValue(mockResults);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toEqual([mockResults]);
			expect(staticData.lastTimeChecked).toBe(fakeNow.toISO());
		});

		it('should advance lastTimeChecked when poll returns empty results', async () => {
			const previousTimestamp = '2023-01-01T00:00:00.000Z';
			staticData.lastTimeChecked = previousTimestamp;

			const fakeNow = DateTime.fromISO('2023-01-02T00:00:00.000Z');
			jest.spyOn(DateTime, 'now').mockReturnValue(fakeNow);

			(getPollResponse as jest.Mock).mockResolvedValue([]);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
			expect(staticData.lastTimeChecked).toBe(fakeNow.toISO());
		});
	});
});
