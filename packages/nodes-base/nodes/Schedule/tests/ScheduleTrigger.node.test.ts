import * as n8nWorkflow from 'n8n-workflow';
import { ScheduleTrigger } from '../ScheduleTrigger.node';
import { createTestTriggerNode } from './TriggerTestUtil';

describe('ScheduleTrigger', () => {
	Object.defineProperty(n8nWorkflow, 'randomInt', {
		value: (min: number, max: number) => Math.floor((min + max) / 2),
	});

	const HOUR = 60 * 60 * 1000;
	const mockDate = new Date('2023-12-28 12:34:56.789Z');
	const timezone = 'Europe/Berlin';
	jest.useFakeTimers();
	jest.setSystemTime(mockDate);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('trigger', () => {
		it('should emit on defined schedule', async () => {
			const { mocks } = await createTestTriggerNode(ScheduleTrigger).test({
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 3 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});

			expect(mocks.emit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(HOUR);
			expect(mocks.emit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(2 * HOUR);
			expect(mocks.emit).toHaveBeenCalledTimes(1);

			const firstTriggerData = mocks.emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual({
				'Day of month': '28',
				'Day of week': 'Thursday',
				Hour: '15',
				Minute: '30',
				Month: 'December',
				'Readable date': 'December 28th 2023, 3:30:30 pm',
				'Readable time': '3:30:30 pm',
				Second: '30',
				Timezone: 'Europe/Berlin (UTC+01:00)',
				Year: '2023',
				timestamp: '2023-12-28T15:30:30.000+01:00',
			});

			jest.setSystemTime(new Date(firstTriggerData.json.timestamp as string));

			jest.advanceTimersByTime(2 * HOUR);
			expect(mocks.emit).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(HOUR);
			expect(mocks.emit).toHaveBeenCalledTimes(2);
		});
	});
});
